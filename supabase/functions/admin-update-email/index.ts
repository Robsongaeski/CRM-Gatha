import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claimsData.claims.sub;

    // Check if requesting user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", {
      _user_id: requestingUserId,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem alterar emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const userId = body.userId;
    const newEmail = body.newEmail?.toString().trim().toLowerCase();

    console.log("Received request:", { userId, newEmail });

    if (!userId || !newEmail) {
      return new Response(
        JSON.stringify({ error: "userId e newEmail são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format - simpler regex that works
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      console.log("Email inválido:", newEmail);
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent changing own email (safety)
    if (userId === requestingUserId) {
      return new Response(
        JSON.stringify({ error: "Você não pode alterar seu próprio email por segurança" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if new email is already in use
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", newEmail.toLowerCase())
      .neq("id", userId)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Este email já está em uso por outro usuário" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email in auth.users using Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail.toLowerCase() }
    );

    if (authError) {
      console.error("Error updating auth.users:", authError);
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar email: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email in profiles table to keep in sync
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ email: newEmail.toLowerCase() })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profiles:", profileError);
      // Note: auth.users was already updated, log this inconsistency
      return new Response(
        JSON.stringify({ 
          error: "Email atualizado na autenticação, mas falhou ao sincronizar perfil",
          details: profileError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email updated for user ${userId}: ${newEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email atualizado com sucesso" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
