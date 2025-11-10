import Image from 'next/image'
import Link from 'next/link'

export function BrandLogo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
      <Image src="/brand/mark.svg" alt="TrackTally logo" width={24} height={24} />
      <span style={{ fontWeight: 700 }}>TrackTally</span>
    </Link>
  )
}

