'use server'

// Cache busting: Timestamp 2026-02-13 13:30 - Fixed user_id to id column
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, Entitlement, Diagnosi } from '@/lib/types'

export async function checkEmailExists(email: string): Promise<boolean> {
  const supabase = await createClient()
  
  console.log('[v0] Checking if email exists:', email)
  
  try {
    const { data, error } = await supabase
      .from('utenti')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (error) {
      console.error('[v0] Error checking email in utenti:', error)
      return false
    }

    const emailExists = data && data.length > 0
    console.log('[v0] Email exists in utenti:', emailExists)
    return emailExists
  } catch (err: any) {
    console.error('[v0] Exception checking email:', err)
    return false
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[v0] Error fetching profile:', error)
    return null
  }

  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('[v0] Error updating profile:', error)
    throw error
  }

  return data
}

export async function createEntitlement(
  userId: string,
  productId: string,
  paymentIntentId: string,
  amountPaid: number
): Promise<Entitlement | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('entitlements')
    .insert({
      user_id: userId,
      product_id: productId,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid: amountPaid,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[v0] Error creating entitlement:', error)
    return null
  }

  return data
}

export async function getEntitlements(userId: string): Promise<Entitlement[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching entitlements:', error)
    return []
  }

  return data || []
}

export async function hasActiveEntitlement(
  userId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  console.log('[v0] Checking entitlement for userId:', userId, 'productId:', productId)
  
  const { data, error } = await supabase
    .from('entitlements')
    .select('id, status')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .in('status', ['active', 'completed'])
    .limit(1)

  if (error) {
    console.error('[v0] Error checking entitlement:', error)
    console.error('[v0] Error details:', JSON.stringify(error))
    return false
  }

  console.log('[v0] Entitlement check result:', data)
  return data && data.length > 0
}

export async function updateEntitlement(
  entitlementId: string,
  updates: Partial<Entitlement>
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('entitlements')
    .update(updates)
    .eq('id', entitlementId)
    .select()
    .single()

  if (error) {
    console.error('[v0] Error updating entitlement:', error)
    throw error
  }

  return data
}

export async function hasCompletedAuditReport(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  console.log('[v0] Checking audit report for userId:', userId)
  
  const { data, error } = await supabase
    .from('audit_reports')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (error) {
    console.error('[v0] Error checking audit report:', error)
    console.error('[v0] Error details:', JSON.stringify(error))
    return false
  }

  console.log('[v0] Audit report check result:', data)
  return data && data.length > 0
}

export async function createUtentiAnalisiLampo(
  userId: string,
  email: string,
  nome: string,
  cognome: string,
  azienda: string
) {
  // Use admin client to bypass RLS - session may not be established yet right after sign-up
  const supabase = createAdminClient()
  
  console.log('[v0] Creating utenti record - PRIMARY KEY COLUMN ID:', userId)
  
  try {
    let { data, error } = await supabase
      .from('utenti')
      .insert({
        id: userId,
        email,
        nome,
        cognome,
        azienda,
        paid_analisi: false,
        paid_diagnosi: false,
      })
      .select()

    // Duplicate key: user already exists (e.g. from auth trigger). Update only form fields, preserve payment data.
    const isDuplicateKey = error?.code === '23505' || error?.message?.includes('duplicate key')
    if (isDuplicateKey) {
      const { data: updateData, error: updateError } = await supabase
        .from('utenti')
        .update({ email, nome, cognome, azienda, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
      if (updateError) {
        console.error('[v0] Error updating utenti:', JSON.stringify(updateError))
        throw new Error(`Failed to update user record: ${updateError.message}`)
      }
      console.log('[v0] Utenti record updated (already existed):', updateData)
      return updateData?.[0]
    }

    if (error) {
      console.error('[v0] Error creating utenti:', JSON.stringify(error))
      throw new Error(`Failed to create user record: ${error.message}`)
    }

    console.log('[v0] Utenti record created successfully:', data)
    return data?.[0]
  } catch (err: any) {
    console.error('[v0] Exception creating utenti:', err.message)
    throw err
  }
}

export async function getUtentiAnalisiLampo(userId: string) {
  // Admin client per bypassare RLS: la tabella utenti può avere policy che bloccano la lettura.
  // Sicuro: userId arriva sempre dalla sessione autenticata (server components).
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('utenti')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching utenti:', JSON.stringify(error))
    return null
  }

  return data ?? null
}

export async function getFormStatus(
  userId: string,
  product: 'analisi-lampo' | 'diagnosi-strategica' = 'analisi-lampo'
) {
  const supabase = createAdminClient()

  const formStatusColumn = product === 'diagnosi-strategica' ? 'form_status_diagnosi' : 'form_status_analisi'

  const { data: utente, error: utenteError } = await supabase
    .from('utenti')
    .select(formStatusColumn)
    .eq('id', userId)
    .limit(1)
    .maybeSingle()

  if (utenteError || !utente) {
    return null
  }

  return utente[formStatusColumn] ?? null
}

export async function createUtentiDiagnosiStrategica(
  userId: string,
  email: string,
  nome: string,
  cognome: string
) {
  const supabase = await createClient()
  
  console.log('[v0] Creating/updating utenti for diagnosi - PRIMARY KEY COLUMN ID:', userId)
  
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('utenti')
      .select('id')
      .eq('id', userId)
      .limit(1)

    if (checkError) {
      console.error('[v0] Error checking utenti:', JSON.stringify(checkError))
      throw checkError
    }

    if (existingUser && existingUser.length > 0) {
      // L'utente esiste già, niente da fare
      console.log('[v0] Utenti record already exists for id:', userId)
      return await getUtentiAnalisiLampo(userId)
    }

    const { data, error } = await supabase
      .from('utenti')
      .insert({
        id: userId,
        email,
        nome,
        cognome,
        paid_analisi: false,
        paid_diagnosi: false,
      })
      .select()

    if (error) {
      console.error('[v0] Error creating utenti:', JSON.stringify(error))
      throw new Error(`Failed to create user record: ${error.message}`)
    }

    return data?.[0]
  } catch (err: any) {
    console.error('[v0] Exception creating utenti:', err.message)
    throw err
  }
}

export async function getUtentiDiagnosiStrategica(userId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('utenti')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching utenti:', JSON.stringify(error))
    return null
  }

  return data ?? null
}

export async function getDiagnosi(
  userId: string,
  tipo: 'analisi_lampo' | 'diagnosi_strategica'
): Promise<Diagnosi | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('diagnosi')
    .select('*')
    .eq('user_id', userId)
    .eq('tipo', tipo)
    .eq('enabled', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching diagnosi:', JSON.stringify(error))
    return null
  }

  return data ?? null
}

export async function hasDiagnosiEnabled(
  userId: string,
  tipo: 'analisi_lampo' | 'diagnosi_strategica'
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('diagnosi')
    .select('id')
    .eq('user_id', userId)
    .eq('tipo', tipo)
    .eq('enabled', true)
    .limit(1)

  if (error) {
    console.error('[v0] Error checking diagnosi enabled:', JSON.stringify(error))
    return false
  }

  return data !== null && data.length > 0
}

export async function getDiagnosiByToken(token: string): Promise<Diagnosi | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('diagnosi')
    .select('*')
    .eq('secret_token', token)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error fetching diagnosi by token:', JSON.stringify(error))
    return null
  }

  return data ?? null
}

export async function updateDiagnosiByToken(
  token: string,
  updates: { diagnosi?: string; enabled?: boolean }
): Promise<Diagnosi | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('diagnosi')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('secret_token', token)
    .select('*')
    .single()

  if (error) {
    console.error('[v0] Error updating diagnosi by token:', JSON.stringify(error))
    return null
  }

  return data ?? null
}
