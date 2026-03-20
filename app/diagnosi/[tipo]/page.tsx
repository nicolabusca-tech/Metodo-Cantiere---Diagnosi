import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDiagnosi } from '@/app/actions/database'
import { displayDiagnosiContent } from '@/lib/diagnosi-content'
import { DiagnosiWithDownload } from '@/components/diagnosi-with-download'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

const VALID_TYPES = ['analisi-lampo', 'diagnosi-strategica'] as const

const LABELS: Record<string, { title: string; dbTipo: 'analisi_lampo' | 'diagnosi_strategica' }> = {
  'analisi-lampo': { title: 'Analisi Lampo', dbTipo: 'analisi_lampo' },
  'diagnosi-strategica': { title: 'Diagnosi Strategica', dbTipo: 'diagnosi_strategica' },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tipo: string }>
}): Promise<Metadata> {
  const { tipo } = await params
  const label = LABELS[tipo]
  return {
    title: label ? `${label.title} - Metodo Cantiere` : 'Diagnosi - Metodo Cantiere',
  }
}

export default async function DiagnosiPage({
  params,
}: {
  params: Promise<{ tipo: string }>
}) {
  const { tipo } = await params

  if (!VALID_TYPES.includes(tipo as typeof VALID_TYPES[number])) {
    notFound()
  }

  const label = LABELS[tipo]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const diagnosi = await getDiagnosi(user.id, label.dbTipo)

  const displayContent = diagnosi
    ? displayDiagnosiContent({
        tipo: label.dbTipo,
        diagnosi: diagnosi.diagnosi,
        volume_1: diagnosi.volume_1,
        volume_2: diagnosi.volume_2,
        volume_3: diagnosi.volume_3,
      })
    : ''

  if (!diagnosi) {
    return (
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center mb-10">
            <Image
              src="/logo-metodo-cantiere.png"
              alt="Metodo Cantiere"
              width={280}
              height={80}
              priority
              className="w-auto h-auto"
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                {label.title} in preparazione
              </h1>
              <p className="text-neutral-600">
                La tua diagnosi è in fase di elaborazione. Ti avviseremo quando sarà pronta.
              </p>
            </div>

            <Link
              href="/prodotti"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Torna ai prodotti
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center mb-10">
          <Image
            src="/logo-metodo-cantiere.png"
            alt="Metodo Cantiere"
            width={280}
            height={80}
            priority
            className="w-auto h-auto"
          />
        </div>

        <div className="mb-6 flex justify-start">
          <Link
            href="/prodotti"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            ← Torna ai prodotti
          </Link>
        </div>

        <DiagnosiWithDownload
          title={label.title}
          createdAt={`Generata il ${new Date(diagnosi.created_at).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`}
          content={displayContent}
          tipo={tipo}
        />
      </div>
    </div>
  )
}
