import Link from 'next/link'

export function BrandLogo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
      <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>TrackTally™</span>
    </Link>
  )
}
