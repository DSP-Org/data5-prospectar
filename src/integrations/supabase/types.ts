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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
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
          fonte_principal: string | null
          fontes: string[]
          link_detalhe: string | null
          list_id: string | null
          logradouro: string | null
          mei_desde: string | null
          mei_optante: boolean | null
          melhor_site: string | null
          melhor_telefone: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          notas: string
          numero: string | null
          owner_desde: string | null
          owner_id: string | null
          porte_estimado: string | null
          product_id: string | null
          prospectar: boolean
          qtd_funcionarios_estimada: string | null
          raw: Json
          razao_social: string
          setores: string[]
          simples_desde: string | null
          simples_optante: boolean | null
          sites: string[]
          situacao: string | null
          status: string
          synced_at: string
          tags: string[]
          telefones: string[]
          tipo_unidade: string | null
          uf: string | null
          unit_id: string | null
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
          fonte_principal?: string | null
          fontes?: string[]
          link_detalhe?: string | null
          list_id?: string | null
          logradouro?: string | null
          mei_desde?: string | null
          mei_optante?: boolean | null
          melhor_site?: string | null
          melhor_telefone?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          notas?: string
          numero?: string | null
          owner_desde?: string | null
          owner_id?: string | null
          porte_estimado?: string | null
          product_id?: string | null
          prospectar?: boolean
          qtd_funcionarios_estimada?: string | null
          raw?: Json
          razao_social?: string
          setores?: string[]
          simples_desde?: string | null
          simples_optante?: boolean | null
          sites?: string[]
          situacao?: string | null
          status?: string
          synced_at?: string
          tags?: string[]
          telefones?: string[]
          tipo_unidade?: string | null
          uf?: string | null
          unit_id?: string | null
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
          fonte_principal?: string | null
          fontes?: string[]
          link_detalhe?: string | null
          list_id?: string | null
          logradouro?: string | null
          mei_desde?: string | null
          mei_optante?: boolean | null
          melhor_site?: string | null
          melhor_telefone?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          notas?: string
          numero?: string | null
          owner_desde?: string | null
          owner_id?: string | null
          porte_estimado?: string | null
          product_id?: string | null
          prospectar?: boolean
          qtd_funcionarios_estimada?: string | null
          raw?: Json
          razao_social?: string
          setores?: string[]
          simples_desde?: string | null
          simples_optante?: boolean | null
          sites?: string[]
          situacao?: string | null
          status?: string
          synced_at?: string
          tags?: string[]
          telefones?: string[]
          tipo_unidade?: string | null
          uf?: string | null
          unit_id?: string | null
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
          {
            foreignKeyName: "companies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          unit_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          unit_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_lists_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      import_items: {
        Row: {
          cnpj: string
          created_at: string
          erro: string | null
          id: string
          job_id: string
          status: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          erro?: string | null
          id?: string
          job_id: string
          status?: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          erro?: string | null
          id?: string
          job_id?: string
          status?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          arquivo: string
          concluidos: number
          created_at: string
          criado_por: string | null
          erros: number
          id: string
          list_id: string | null
          nao_encontrados: number
          status: string
          total: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          arquivo?: string
          concluidos?: number
          created_at?: string
          criado_por?: string | null
          erros?: number
          id?: string
          list_id?: string | null
          nao_encontrados?: number
          status?: string
          total?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          arquivo?: string
          concluidos?: number
          created_at?: string
          criado_por?: string | null
          erros?: number
          id?: string
          list_id?: string | null
          nao_encontrados?: number
          status?: string
          total?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "company_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          nome: string
          tipo: string
          unit_id: string | null
          updated_at: string
          valor_referencia: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          tipo?: string
          unit_id?: string | null
          updated_at?: string
          valor_referencia?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          tipo?: string
          unit_id?: string | null
          updated_at?: string
          valor_referencia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospection_activities: {
        Row: {
          company_cnpj: string
          completed_at: string | null
          created_at: string
          id: string
          observacao: string
          product_id: string | null
          responsavel: string | null
          scheduled_at: string | null
          tipo: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          company_cnpj: string
          completed_at?: string | null
          created_at?: string
          id?: string
          observacao?: string
          product_id?: string | null
          responsavel?: string | null
          scheduled_at?: string | null
          tipo: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          company_cnpj?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          observacao?: string
          product_id?: string | null
          responsavel?: string | null
          scheduled_at?: string | null
          tipo?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospection_activities_company_cnpj_fkey"
            columns: ["company_cnpj"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["cnpj"]
          },
          {
            foreignKeyName: "prospection_activities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospection_activities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          role: string
          rota: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          rota: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          rota?: string
        }
        Relationships: []
      }
      supressoes: {
        Row: {
          canal: string
          created_at: string
          criado_por: string | null
          id: string
          motivo: string
          origem: string
          valor: string
        }
        Insert: {
          canal: string
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          origem?: string
          valor: string
        }
        Update: {
          canal?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          origem?: string
          valor?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_products_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string
          descricao: string
          id: string
          nome: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cor?: string
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          ativa: boolean
          cidade: string | null
          cor: string
          created_at: string
          id: string
          nome: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cidade?: string | null
          cor?: string
          created_at?: string
          id?: string
          nome: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cidade?: string | null
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          efeito: string
          id: string
          rota: string
          user_id: string
        }
        Insert: {
          created_at?: string
          efeito?: string
          id?: string
          rota: string
          user_id: string
        }
        Update: {
          created_at?: string
          efeito?: string
          id?: string
          rota?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_units: {
        Row: {
          created_at: string
          id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_unit: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      pode_acessar: {
        Args: { _rota: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "gestor" | "usuario" | "admin_unidade"
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
    Enums: {
      app_role: ["master", "gestor", "usuario", "admin_unidade"],
    },
  },
} as const
