import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'

function MyApp({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <>
      <style jsx global>{`
        body {
          opacity: ${isClient ? 1 : 0};
        }
      `}</style>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
