export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cidade: string | null
          cnae_codigo: string | null
          cnae_descricao: string | null
          cnpj: string
          complemento: string | null
          contatos: Json
          created_at: string
          data_abertura: string | null
          decisores: Json
          email_receita: string | null
          emails: string[]
          enquadramento_porte: string[]
          faturamento_presumido: string | null
          link_detalhe: string | null
          list_id: string | null
          logradouro: string | null
          melhor_site: string | null
          melhor_telefone: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          notas: string
          numero: string | null
          porte_estimado: string | null
          qtd_funcionarios_estimada: string | null
          raw: Json
          razao_social: string
          setores: string[]
          sites: string[]
          situacao: string | null
          status: string
          synced_at: string
          tags: string[]
          telefones: string[]
          tipo_unidade: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_codigo?: string | null
          cnae_descricao?: string | null
          cnpj: string
          complemento?: string | null
          contatos?: Json
          created_at?: string
          data_abertura?: string | null
          decisores?: Json
          email_receita?: string | null
          emails?: string[]
          enquadramento_porte?: string[]
          faturamento_presumido?: string | null
          link_detalhe?: string | null
          list_id?: string | null
          logradouro?: string | null
          melhor_site?: string | null
          melhor_telefone?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          notas?: string
          numero?: string | null
          porte_estimado?: string | null
          qtd_funcionarios_estimada?: string | null
          raw?: Json
          razao_social?: string
          setores?: string[]
          sites?: string[]
          situacao?: string | null
          status?: string
          synced_at?: string
          tags?: string[]
          telefones?: string[]
          tipo_unidade?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_codigo?: string | null
          cnae_descricao?: string | null
          cnpj?: string
          complemento?: string | null
          contatos?: Json
          created_at?: string
          data_abertura?: string | null
          decisores?: Json
          email_receita?: string | null
          emails?: string[]
          enquadramento_porte?: string[]
          faturamento_presumido?: string | null
          link_detalhe?: string | null
          list_id?: string | null
          logradouro?: string | null
          melhor_site?: string | null
          melhor_telefone?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          notas?: string
          numero?: string | null
          porte_estimado?: string | null
          qtd_funcionarios_estimada?: string | null
          raw?: Json
          razao_social?: string
          setores?: string[]
          sites?: string[]
          situacao?: string | null
          status?: string
          synced_at?: string
          tags?: string[]
          telefones?: string[]
          tipo_unidade?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "company_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      company_lists: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      query_log: {
        Row: {
          created_at: string
          entrada: string
          id: string
          mensagem: string | null
          quantidade: number
          resultado: string
          tipo: string
        }
        Insert: {
          created_at?: string
          entrada: string
          id?: string
          mensagem?: string | null
          quantidade?: number
          resultado: string
          tipo: string
        }
        Update: {
          created_at?: string
          entrada?: string
          id?: string
          mensagem?: string | null
          quantidade?: number
          resultado?: string
          tipo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
