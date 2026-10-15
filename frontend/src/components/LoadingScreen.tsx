export default function LoadingScreen({ message = 'Carregando plataforma…' }: { message?: string }) {
  return <main className="loading-screen" aria-live="polite"><div className="loading-card"><img src="/logo-ellenco.png" alt="Ellenco"/><div className="loader"/><p>{message}</p></div></main>;
}
