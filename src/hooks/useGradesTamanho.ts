import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GradeTamanho {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeTamanhoItem {
  id: string;
  grade_id: string;
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface PedidoItemGrade {
  id: string;
  pedido_item_id: string;
  tamanho_codigo: string;
  tamanho_nome: string;
  quantidade: number;
  created_at: string;
}

// Listar todas as grades
export function useGradesTamanho() {
  return useQuery({
    queryKey: ["grades-tamanho"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades_tamanho")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as GradeTamanho[];
    },
  });
}

// Buscar grade específica com seus itens
export function useGradeTamanho(id: string | undefined) {
  return useQuery({
    queryKey: ["grade-tamanho", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("grades_tamanho")
        .select(`
          *,
          itens:grade_tamanho_itens(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Buscar itens de uma grade
export function useGradeTamanhoItens(gradeId: string | undefined) {
  return useQuery({
    queryKey: ["grade-tamanho-itens", gradeId],
    queryFn: async () => {
      if (!gradeId) return [];

      const { data, error } = await supabase
        .from("grade_tamanho_itens")
        .select("*")
        .eq("grade_id", gradeId)
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as GradeTamanhoItem[];
    },
    enabled: !!gradeId,
  });
}

// Criar grade
export function useCreateGradeTamanho() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome: string; descricao?: string }) => {
      const { data: grade, error } = await supabase
        .from("grades_tamanho")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return grade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades-tamanho"] });
      toast.success("Grade criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar grade:", error);
      toast.error("Erro ao criar grade");
    },
  });
}

// Atualizar grade
export function useUpdateGradeTamanho(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome?: string; descricao?: string; ativo?: boolean }) => {
      const { data: grade, error } = await supabase
        .from("grades_tamanho")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return grade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades-tamanho"] });
      queryClient.invalidateQueries({ queryKey: ["grade-tamanho", id] });
      toast.success("Grade atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar grade:", error);
      toast.error("Erro ao atualizar grade");
    },
  });
}

// Deletar grade
export function useDeleteGradeTamanho() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("grades_tamanho")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades-tamanho"] });
      toast.success("Grade excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir grade:", error);
      toast.error("Erro ao excluir grade");
    },
  });
}

// Criar item da grade
export function useCreateGradeTamanhoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      grade_id: string;
      codigo: string;
      nome: string;
      ordem: number;
    }) => {
      const { data: item, error } = await supabase
        .from("grade_tamanho_itens")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["grade-tamanho-itens", variables.grade_id] });
      queryClient.invalidateQueries({ queryKey: ["grade-tamanho", variables.grade_id] });
      toast.success("Tamanho adicionado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao adicionar tamanho:", error);
      toast.error("Erro ao adicionar tamanho");
    },
  });
}

// Deletar item da grade
export function useDeleteGradeTamanhoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, gradeId }: { id: string; gradeId: string }) => {
      const { error } = await supabase
        .from("grade_tamanho_itens")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return gradeId;
    },
    onSuccess: (gradeId) => {
      queryClient.invalidateQueries({ queryKey: ["grade-tamanho-itens", gradeId] });
      queryClient.invalidateQueries({ queryKey: ["grade-tamanho", gradeId] });
      toast.success("Tamanho removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover tamanho:", error);
      toast.error("Erro ao remover tamanho");
    },
  });
}

// Buscar grades de um item do pedido
export function usePedidoItemGrades(pedidoItemId: string | undefined) {
  return useQuery({
    queryKey: ["pedido-item-grades", pedidoItemId],
    queryFn: async () => {
      if (!pedidoItemId) return [];

      const { data, error } = await supabase
        .from("pedido_item_grades")
        .select("*")
        .eq("pedido_item_id", pedidoItemId)
        .order("tamanho_codigo");

      if (error) throw error;
      return data as PedidoItemGrade[];
    },
    enabled: !!pedidoItemId,
  });
}
