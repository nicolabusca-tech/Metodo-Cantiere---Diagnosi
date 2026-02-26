'use client'

import HeaderWithProfile from '@/components/header-with-profile'

export default function PaymentLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <HeaderWithProfile />
      <div className="py-12 px-4">
        {children}
      </div>
    </div>
  )
}
