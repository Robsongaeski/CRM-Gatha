// Deno Edge Function: admin-create-user
// Allows admins to create new users without auto-login side effect

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticated client (to read current caller user)
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  // Service role client for privileged operations
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure requester is admin
    const { data: roles, error: roleErr } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("role", "admin")
      .limit(1);

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, nome, whatsapp, ativo, roles: userRoles, profiles } = body;

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nome || typeof nome !== "string") {
      return new Response(JSON.stringify({ error: "nome is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user using admin API (no auto-login)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        nome,
        whatsapp: whatsapp || null,
        ativo: ativo ?? true,
      },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newUser?.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Create profile entry (trigger should have done this, but let's ensure it exists)
    const { error: profileCheckErr } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        nome,
        email,
        whatsapp: whatsapp || null,
        ativo: ativo ?? true,
      }, { onConflict: 'id' });

    if (profileCheckErr) {
      console.error("Profile upsert error:", profileCheckErr);
    }

    // Add user roles (legacy system)
    if (userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
      const rolesToInsert = userRoles.map((role: string) => ({
        user_id: userId,
        role,
      }));

      const { error: rolesInsertErr } = await adminClient
        .from("user_roles")
        .insert(rolesToInsert);

      if (rolesInsertErr) {
        console.error("Roles insert error:", rolesInsertErr);
        return new Response(JSON.stringify({ error: "Failed to assign roles: " + rolesInsertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Add user profiles (RBAC system)
    if (profiles && Array.isArray(profiles) && profiles.length > 0) {
      const profilesToInsert = profiles.map((profileId: string) => ({
        user_id: userId,
        profile_id: profileId,
      }));

      const { error: profilesInsertErr } = await adminClient
        .from("user_profiles")
        .insert(profilesToInsert);

      if (profilesInsertErr) {
        console.error("Profiles insert error:", profilesInsertErr);
        return new Response(JSON.stringify({ error: "Failed to assign profiles: " + profilesInsertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
