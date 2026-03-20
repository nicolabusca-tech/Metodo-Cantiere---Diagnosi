export interface Profile {
  id: string
  email: string
  nome: string | null
  cognome: string | null
  company_name: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Entitlement {
  id: string
  user_id: string
  product_id: string
  purchase_date: string
  stripe_payment_intent_id: string | null
  amount_paid: number
  report_link: string | null
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AuditReport {
  id: string
  user_id: string
  entitlement_id: string
  report_data: Record<string, any>
  generated_at: string
  pdf_url: string | null
  status: 'draft' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export interface DiagnosiReport {
  id: string
  user_id: string
  entitlement_id: string
  report_data: Record<string, any>
  generated_at: string
  pdf_url: string | null
  status: 'draft' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export type DiagnosiProgresso = 'in corso' | 'completato'

export interface Diagnosi {
  id: string
  user_id: string
  tipo: 'analisi_lampo' | 'diagnosi_strategica'
  diagnosi: string
  volume_1: string
  volume_2: string
  volume_3: string
  enabled: boolean
  progresso: DiagnosiProgresso
  secret_token: string
  created_at: string
  updated_at: string
}
