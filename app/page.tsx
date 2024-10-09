import dynamic from 'next/dynamic';

const GameComponent = dynamic(() => import('../components/Game'), { ssr: false });

export default function Home() {
  return (
    <main>
      <GameComponent />
    </main>
  );
}