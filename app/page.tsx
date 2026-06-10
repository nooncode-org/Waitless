import type { Metadata } from 'next'
import './landing/landing.css'

export const metadata: Metadata = {
  title: 'WAITLESS — Operación perfecta. Sin fricciones.',
  description:
    'Plataforma operativa white-label para restaurantes. De la mesa al cobro en 11 segundos.',
}

export default function LandingPage() {
  return (
    <main className="antialiased relative">
      
      
      {/* ─────────────────── LIVE TICKER (Bloomberg-style) ─────────────────── */}
      <div className="bg-black text-white h-9 overflow-hidden flex items-center text-[12px] font-medium-tight relative grain">
        <div className="shrink-0 px-4 h-full flex items-center gap-2 border-r border-white/15 z-10 bg-black">
          <span className="dot live-dot" style={{ background: '#BEEBBE', width: '6px', height: '6px' }}></span>
          <span className="mono uppercase tracking-[0.18em] text-[10.5px]">WAITLESS · en vivo</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-track flex items-center gap-10 whitespace-nowrap mono text-[12px] text-white/85 px-6">
            <span><span className="text-white/45">13:42·05</span> &nbsp;Mesa 7 lista &nbsp;<span className="text-[#BEEBBE]">noon</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:42·02</span> &nbsp;Pedido #481 &nbsp;$284.00 &nbsp;<span className="text-[#BEEBBE]">BURGER/CO</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:41·58</span> &nbsp;Cocina 100% SLA &nbsp;<span className="text-[#BEEBBE]">↑</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:41·44</span> &nbsp;Mesa 3 cobrada &nbsp;11s &nbsp;<span className="text-[#BEEBBE]">SUSHI 88</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:41·20</span> &nbsp;Reabasto chiles &nbsp;Tacos Norte</span>
            <span>·</span>
            <span><span className="text-white/45">13:41·08</span> &nbsp;Nuevo restaurante &nbsp;Café Otro &nbsp;<span className="text-[#BEEBBE]">+</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:40·51</span> &nbsp;Ticket promedio $487 &nbsp;<span className="text-[#BEEBBE]">+12%</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:40·22</span> &nbsp;Pedido #480 &nbsp;$612.00 &nbsp;<span className="text-[#BEEBBE]">La Esquina</span></span>
            <span>·</span>
            {/* duplicate */}
            <span><span className="text-white/45">13:42·05</span> &nbsp;Mesa 7 lista &nbsp;<span className="text-[#BEEBBE]">noon</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:42·02</span> &nbsp;Pedido #481 &nbsp;$284.00 &nbsp;<span className="text-[#BEEBBE]">BURGER/CO</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:41·58</span> &nbsp;Cocina 100% SLA &nbsp;<span className="text-[#BEEBBE]">↑</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:41·44</span> &nbsp;Mesa 3 cobrada &nbsp;11s &nbsp;<span className="text-[#BEEBBE]">SUSHI 88</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:41·20</span> &nbsp;Reabasto chiles &nbsp;Tacos Norte</span>
            <span>·</span>
            <span><span className="text-white/45">13:41·08</span> &nbsp;Nuevo restaurante &nbsp;Café Otro &nbsp;<span className="text-[#BEEBBE]">+</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:40·51</span> &nbsp;Ticket promedio $487 &nbsp;<span className="text-[#BEEBBE]">+12%</span></span>
            <span>·</span>
            <span><span className="text-white/45">13:40·22</span> &nbsp;Pedido #480 &nbsp;$612.00 &nbsp;<span className="text-[#BEEBBE]">La Esquina</span></span>
            <span>·</span>
          </div>
        </div>
        <div className="shrink-0 hidden md:flex items-center gap-4 px-4 border-l border-white/15 h-full mono text-[10.5px] uppercase tracking-[0.18em] z-10 bg-black">
          <span>340+ rests</span>
          <span className="text-white/40">/</span>
          <span>11s avg</span>
          <span className="text-white/40">/</span>
          <span className="text-[#BEEBBE]">99.98% up</span>
        </div>
      </div>
      
      {/* ─────────────────── NAV ─────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md nav-shadow">
        <div className="max-w-[1440px] mx-auto px-8 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center gap-2.5">
              <span className="w-logo">W</span>
              <span className="font-display text-[19px] tracking-[-0.045em]">WAITLESS</span>
              <span className="mono text-[10px] text-black/40 uppercase tracking-[0.16em] ml-1 hidden md:inline">v10</span>
            </a>
            <nav className="hidden lg:flex items-center gap-8 text-[13.5px] text-black/65 font-medium-tight">
              <a href="#turno" className="hover:text-black hover-line">El turno</a>
              <a href="#superficies" className="hover:text-black hover-line">Cinco superficies</a>
              <a href="#porque" className="hover:text-black hover-line">Por qué</a>
              <a href="#precios" className="hover:text-black hover-line">Carta de planes</a>
              <a href="#clientes" className="hover:text-black hover-line">Clientes</a>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <a href="/explore" className="hidden md:inline-flex items-center gap-1.5 px-3.5 h-9 text-[13px] font-medium-tight text-black/65 hover:text-black">
              Explorar restaurantes <span className="arr">→</span>
            </a>
            <div className="hidden md:relative md:inline-block group">
              <button className="inline-flex items-center px-3.5 h-9 text-[13px] font-medium-tight text-black/65 hover:text-black cursor-pointer bg-transparent border-none">Iniciar sesión</button>
              <div className="absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="bg-white rounded-xl shadow-xl border border-black/10 p-1 w-52">
                  <a href="/consumidor" className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium-tight text-black/70 hover:text-black hover:bg-black/5 rounded-lg">
                    Soy cliente
                  </a>
                  <a href="/restaurante" className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium-tight text-black/70 hover:text-black hover:bg-black/5 rounded-lg">
                    Soy restaurante
                  </a>
                </div>
              </div>
            </div>
            <a href="#precios" className="ml-2 inline-flex items-center gap-1.5 px-4 h-9 bg-black text-white rounded-full text-[13px] font-bold hover:bg-[#171717]">
              Ver planes <span className="arr">→</span>
            </a>
          </div>
        </div>
        {/* Mobile login row — visible only on small screens */}
        <div className="md:hidden border-t border-black/10 flex">
          <a href="/consumidor" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium-tight text-black/65 hover:text-black">
            Soy cliente <span className="arr">→</span>
          </a>
          <span className="border-r border-black/10"></span>
          <a href="/restaurante" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium-tight text-black/65 hover:text-black">
            Soy restaurante <span className="arr">→</span>
          </a>
        </div>
      </header>
      
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative overflow-hidden">
      
        {/* margin gutters with labels */}
        <div className="absolute left-0 top-0 bottom-0 w-10 border-r hairline hidden md:flex flex-col items-center justify-between py-8 z-10 bg-white">
          <span className="mono text-[10px] uppercase tracking-[0.22em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Cap. 01 · El primer turno</span>
          <span className="mono text-[10px] text-black/45 uppercase tracking-[0.22em]">001</span>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-10 border-l hairline hidden md:flex flex-col items-center justify-between py-8 z-10 bg-white">
          <span className="mono text-[10px] text-black/45 uppercase tracking-[0.22em]">2026 ·</span>
          <span className="mono text-[10px] uppercase tracking-[0.22em]" style={{ writingMode: 'vertical-rl' }}>Edición LATAM</span>
        </div>
      
        <div className="md:px-10">
          <div className="border-b hairline">
            {/* big editorial type */}
            <div className="px-8 pt-16 pb-8 max-w-[1440px] mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <span className="eyebrow">— Plataforma operativa</span>
                  <span className="text-black/30">/</span>
                  <span className="eyebrow eyebrow-mute">White-label · LATAM</span>
                </div>
                <div className="hidden md:flex items-center gap-3 mono text-[11px] text-black/55">
                  <span>Hoy</span>
                  <span className="text-black/25">·</span>
                  <span className="num">14 may 2026</span>
                  <span className="text-black/25">·</span>
                  <span>13:42</span>
                </div>
              </div>
      
              <h1 className="font-display hero-h1">
                Operación
              </h1>
              <h1 className="font-display hero-h1 flex items-baseline gap-[0.15em] flex-wrap">
                <span>perfecta.</span>
                <span className="hidden xl:inline-flex items-center gap-3 align-middle px-5 h-[0.45em] mint mint-fg rounded-full mono text-[18px] -translate-y-[0.06em] whitespace-nowrap">
                  <span className="dot live-dot" style={{ background: '#0a3a0a', width: '8px', height: '8px' }}></span>
                  Mesa 7 lista · 00:11
                </span>
              </h1>
              <h1 className="font-display hero-h1">
                <span className="stroke-text">Sin</span> <span className="strike-mint">fricciones.</span>
              </h1>
            </div>
          </div>
      
          {/* subline + ctas + live column */}
          <div className="border-b hairline">
            <div className="max-w-[1440px] mx-auto px-8 py-12 grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-2 hidden lg:block">
                  <div className="swiss-num">§ 01.01</div>
                  <div className="swiss-num mt-2">Manifiesto</div>
                </div>
                <div className="col-span-12 lg:col-span-10">
                  <p className="text-[22px] leading-[1.35] font-medium-tight text-black max-w-[680px]">
                    De la mesa al cobro en <span className="hl-mint font-bold">11 segundos</span>. Pedidos, cocina,
                    pagos y analítica conectados en tiempo real — una sola plataforma, una sola marca, una sola
                    fuente de verdad para tu restaurante.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <a href="/registro" className="inline-flex items-center gap-2 h-12 px-6 bg-black text-white rounded-full text-[15px] font-bold">
                      Comenzar gratis <span className="arr">→</span>
                    </a>
                    <a href="#turno" className="inline-flex items-center gap-2 h-12 px-6 border hairline rounded-full text-[15px] font-medium-tight hover:border-black">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 4.5L9 7L5.5 9.5V4.5Z" fill="currentColor"/></svg>
                      Ver un turno completo
                    </a>
                    <span className="mono text-[11.5px] text-black/45 ml-2">Setup 7 min · sin tarjeta</span>
                  </div>
                </div>
              </div>
      
              {/* LIVE column */}
              <aside className="col-span-12 lg:col-span-5 lg:pl-8 lg:border-l hairline">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="dot live-dot" style={{ background: '#0a3a0a', width: '7px', height: '7px' }}></span>
                    <span className="eyebrow">Feed operativo · 14 may 13:42</span>
                  </div>
                  <span className="mono text-[10.5px] text-black/45">↻ auto</span>
                </div>
                <ul className="mt-5 space-y-3 mono text-[12.5px]">
                  <li className="flex items-baseline gap-3">
                    <span className="text-black/40 num shrink-0">13:42·05</span>
                    <span className="text-black flex-1">Mesa 7 marcada lista por cocina</span>
                    <span className="chip-data shrink-0">noon</span>
                  </li>
                  <li className="flex items-baseline gap-3">
                    <span className="text-black/40 num shrink-0">13:41·44</span>
                    <span className="text-black flex-1">Mesa 3 cobrada vía QR en 11s</span>
                    <span className="mono text-[11px] font-bold">$284.00</span>
                  </li>
                  <li className="flex items-baseline gap-3">
                    <span className="text-black/40 num shrink-0">13:41·22</span>
                    <span className="text-black flex-1">Pedido #480 — split en 4 personas</span>
                    <span className="mono text-[11px] text-black/55">La Esquina</span>
                  </li>
                  <li className="flex items-baseline gap-3">
                    <span className="text-black/40 num shrink-0">13:40·58</span>
                    <span className="text-black flex-1">Reabasto sugerido: chiles serranos</span>
                    <span className="mono text-[11px] text-black/55">−12u</span>
                  </li>
                  <li className="flex items-baseline gap-3">
                    <span className="text-black/40 num shrink-0">13:40·12</span>
                    <span className="text-black flex-1">Nuevo cliente recurrente · 3era visita</span>
                    <span className="mono text-[11px] mint mint-fg px-1.5 rounded">★</span>
                  </li>
                </ul>
                <div className="mt-5 flex items-center justify-between text-[11px] text-black/50 font-medium-tight border-t hairline pt-3">
                  <span>Datos reales agregados · 340 restaurantes</span>
                  <a href="/explore" className="hover-line text-black">Ver todo →</a>
                </div>
              </aside>
            </div>
          </div>
      
          {/* specs strip */}
          <div className="border-b hairline">
            <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 divide-x hairline">
              <div className="px-8 py-8">
                <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/50">[1]</div>
                <div className="big-num text-[64px] mt-2">2<span className="text-[40px] align-top">×</span></div>
                <div className="text-[12.5px] text-black/60 font-medium-tight mt-1">pagos más rápidos</div>
              </div>
              <div className="px-8 py-8">
                <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/50">[2]</div>
                <div className="big-num text-[64px] mt-2">+40<span className="text-[40px] align-top">%</span></div>
                <div className="text-[12.5px] text-black/60 font-medium-tight mt-1">ventas por mesa</div>
              </div>
              <div className="px-8 py-8">
                <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/50">[3]</div>
                <div className="big-num text-[64px] mt-2">−30<span className="text-[40px] align-top">%</span></div>
                <div className="text-[12.5px] text-black/60 font-medium-tight mt-1">errores en cocina</div>
              </div>
              <div className="px-8 py-8 mint">
                <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-[#0a3a0a]/60">[4]</div>
                <div className="big-num text-[64px] mt-2 text-[#0a3a0a]">11<span className="text-[40px] align-top">s</span></div>
                <div className="text-[12.5px] text-[#0a3a0a]/80 font-medium-tight mt-1">mesa → cobro promedio</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* ─────────────────── EL TURNO — kitchen ticket timeline ─────────────────── */}
      <section id="turno" className="relative border-b hairline py-28 paper overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-12 gap-8 items-end">
            <div className="col-span-12 lg:col-span-7 min-w-0">
              <div className="flex items-center gap-3 mb-6">
                <span className="swiss-num">CAP. 02</span>
                <span className="h-px w-10 bg-black/30"></span>
                <span className="eyebrow">El turno · 11 minutos</span>
              </div>
              <h2 className="font-display mega break-words">
                La vida de<br/>una mesa.
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-5 min-w-0 text-[15.5px] leading-[1.55] text-black/70 font-medium-tight">
              Sigue una mesa real, de la entrada al cobro. Cada paso vive en WAITLESS — sin papelitos,
              sin gritos a cocina, sin TPV a medio camino. <span className="text-black">Solo el turno corriendo solo.</span>
            </div>
          </div>
      
          {/* Receipt / kitchen ticket */}
          <div className="mt-16 mx-auto max-w-[1080px] relative">
            <div className="receipt bg-white">
              {/* header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-dashed border-black/30">
                <div className="flex items-center gap-3">
                  <span className="w-logo">W</span>
                  <div>
                    <div className="font-display text-[18px] tracking-[-0.04em]">noon · Mesa 7</div>
                    <div className="mono text-[11px] text-black/55">TKT #481 · 4 pax · Carla / Mesero</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-[11px] text-black/55 uppercase tracking-[0.16em]">14 may · jueves</div>
                  <div className="mono text-[14px] font-bold mt-1">13:31 → 13:42</div>
                </div>
              </div>
      
              {/* timeline rows */}
              <ol className="px-8 py-6 divide-y divide-dashed divide-black/15">
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num">00:00</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">01</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Entran 4 personas.</span> El mesero asigna Mesa 7 desde el panel — la mesa pasa a <span className="chip-data">OCUPADA</span>
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-black/55 text-right">Panel · Mesas</div>
                </li>
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num">00:12</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">02</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Escanean el QR.</span> Cada comensal ve el menú en su celular, en español, con fotos y modificadores.
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-black/55 text-right">Menú QR</div>
                </li>
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num">00:48</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">03</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Ordenan en paralelo.</span> 6 items, 1 modificación, 0 errores. La comanda entra a cocina al instante.
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-black/55 text-right">→ KDS Plancha · Frío</div>
                </li>
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num">04:30</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">04</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Cocina marca listo.</span> SLA 100% por estación — el mesero recibe ping en el panel.
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-black/55 text-right">KDS · SLA ok</div>
                </li>
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num">07:15</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">05</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Mesa servida.</span> Carla pasa, confirma, registra una nota: <span className="italic text-black/65">&ldquo;sin cilantro, mesa contenta&rdquo;</span>
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-black/55 text-right">Panel · Notas</div>
                </li>
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num">09:42</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">06</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Pagan desde el celular.</span> Split 4 personas · propina 15% · Apple Pay · 11 segundos.
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-black/55 text-right">Wallet · QR</div>
                </li>
                <li className="grid grid-cols-12 gap-4 py-4 items-baseline">
                  <div className="col-span-2 mono text-[13px] font-bold num text-[#0a3a0a]">11:08</div>
                  <div className="col-span-1 mono text-[11px] text-black/45">07</div>
                  <div className="col-span-6 text-[15.5px] font-medium-tight">
                    <span className="font-bold">Mesa libre.</span> La rotación se cuenta sola. Feedback enlazado al mesero, ingreso conciliado.
                  </div>
                  <div className="col-span-3 mono text-[11.5px] text-right"><span className="chip-data">CERRADO · $612</span></div>
                </li>
              </ol>
      
              {/* totals */}
              <div className="px-8 py-6 border-t border-dashed border-black/30 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/45">Tiempo total</div>
                  <div className="font-display text-[28px] mt-1 num">11:08</div>
                </div>
                <div>
                  <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/45">Ticket</div>
                  <div className="font-display text-[28px] mt-1 num">$612</div>
                </div>
                <div>
                  <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/45">Propina</div>
                  <div className="font-display text-[28px] mt-1 num">$92</div>
                </div>
                <div>
                  <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/45">Reseña</div>
                  <div className="font-display text-[28px] mt-1">★★★★★</div>
                </div>
              </div>
      
              {/* perforated bottom */}
              <div className="h-2.5" style={{ background: 'radial-gradient(circle at 5px 5px, transparent 4px, #fff 4.5px) 0 0/10px 10px' }}></div>
            </div>
      
            {/* marginalia */}
            <div className="hidden lg:block absolute -right-10 top-8 max-w-[200px] text-right">
              <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-black/45 mb-1">↑ Fig. A</div>
              <div className="text-[12px] text-black/70 leading-snug italic font-medium-tight">
                Ticket impreso del turno completo en Mesa 7. Cada minuto vive en el panel — incluyendo los segundos.
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* ─────────────────── CINCO SUPERFICIES — chapters I-V ─────────────────── */}
      <section id="superficies" className="border-b hairline">
        <div className="max-w-[1440px] mx-auto px-8 pt-28 pb-10">
          <div className="grid grid-cols-12 gap-8 mb-14">
            <div className="col-span-12 lg:col-span-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="swiss-num">CAP. 03</span>
                <span className="h-px w-10 bg-black/30"></span>
                <span className="eyebrow">Cinco superficies, una operación</span>
              </div>
              <h2 className="font-display mega">
                Un solo<br/>
                backend.<br/>
                <span className="text-black/30">Cinco caras.</span>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-4 self-end text-[15.5px] leading-[1.55] text-black/70 font-medium-tight">
              Cada superficie está hecha a propósito para una persona — el restaurantero, el comensal, el mesero, la cocina.
              Pero todas comparten el mismo turno, los mismos datos, la misma marca.
            </div>
          </div>
        </div>
      
        {/* Chapter I — Landing B2B */}
        <article className="border-t hairline">
          <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-8 py-16 items-center">
            <div className="col-span-12 md:col-span-3">
              <div className="font-display roman">I</div>
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="eyebrow mb-3">Superficie · Landing B2B</div>
              <h3 className="font-display text-[44px] leading-[0.95] tracking-[-0.04em]">Convierte<br/>restaurantes en<br/>clientes.</h3>
              <p className="mt-5 text-[14.5px] text-black/65 leading-[1.55] font-medium-tight max-w-md">
                Marketing premium con narrativa, pruebas y precios. Demos automáticas, casos de éxito, cierre directo.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 mono text-[11px]">
                <span className="px-2.5 h-7 inline-flex items-center border hairline rounded-full">/ home</span>
                <span className="px-2.5 h-7 inline-flex items-center border hairline rounded-full">/ precios</span>
                <span className="px-2.5 h-7 inline-flex items-center border hairline rounded-full">/ clientes</span>
                <span className="px-2.5 h-7 inline-flex items-center border hairline rounded-full">/ docs</span>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="rounded-2xl border hairline overflow-hidden">
                <div className="h-7 border-b hairline-2 flex items-center gap-1.5 px-3">
                  <span className="dot" style={{ width: '6px', height: '6px', background: '#dfdfdf' }}></span>
                  <span className="dot" style={{ width: '6px', height: '6px', background: '#dfdfdf' }}></span>
                  <span className="dot" style={{ width: '6px', height: '6px', background: '#dfdfdf' }}></span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-1.5"><span className="w-logo sm">W</span><span className="font-display text-[11px] tracking-[-0.045em]">WAITLESS</span></div>
                  <div className="font-display text-[34px] leading-[0.92] tracking-[-0.045em] mt-5">Operación<br/>perfecta.</div>
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 w-32 bg-black/10 rounded-full"></div>
                    <div className="h-1.5 w-40 bg-black/10 rounded-full"></div>
                  </div>
                  <div className="mt-4 inline-flex h-7 px-3 items-center bg-black text-white rounded-full text-[10px] font-bold">Comenzar →</div>
                </div>
              </div>
            </div>
          </div>
        </article>
      
        {/* Chapter II — Marketplace */}
        <article className="border-t hairline bg-[#FAFAFA]">
          <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-8 py-16 items-center">
            <div className="col-span-12 md:col-span-4 md:order-2 md:text-right">
              <div className="font-display roman">II</div>
            </div>
            <div className="col-span-12 md:col-span-5 md:order-1">
              <div className="eyebrow mb-3">Superficie · Marketplace /explore</div>
              <h3 className="font-display text-[44px] leading-[0.95] tracking-[-0.04em]">Descubre,<br/>elige, ordena.</h3>
              <p className="mt-5 text-[14.5px] text-black/65 leading-[1.55] font-medium-tight max-w-md">
                Una vitrina pública para todos los restaurantes en WAITLESS. Filtros por cocina, distancia, tiempo y horario.
              </p>
              <div className="mt-6 mono text-[12px] text-black/55 leading-relaxed">
                → 340 restaurantes activos<br/>
                → 12 categorías<br/>
                → Apertura en tiempo real
              </div>
            </div>
            <div className="col-span-12 md:col-span-3 md:order-3 md:col-start-9">
              <div className="rounded-2xl border hairline bg-white p-4">
                <div className="bg-[#F4F4F4] border hairline-2 rounded-full h-8 px-3 flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="#9a9a9a" strokeWidth="1.2"/><path d="M7.6 7.6L10 10" stroke="#9a9a9a" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <span className="text-[11px] text-black/50 font-medium-tight">Tacos cerca de mí</span>
                </div>
                <div className="flex gap-1.5 mt-3 overflow-hidden">
                  <span className="px-2 h-6 inline-flex items-center bg-black text-white rounded-full text-[10px] font-bold">Todos</span>
                  <span className="px-2 h-6 inline-flex items-center bg-white border hairline-2 rounded-full text-[10px]">Tacos</span>
                  <span className="px-2 h-6 inline-flex items-center bg-white border hairline-2 rounded-full text-[10px]">Sushi</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white border hairline-2 rounded-lg overflow-hidden">
                    <div className="h-14 ph relative"><span className="absolute top-1.5 left-1.5 chip-data">DESTACADO</span></div>
                    <div className="p-2"><div className="text-[10.5px] font-bold">noon</div><div className="text-[9px] text-black/55 mono">15–25 min</div></div>
                  </div>
                  <div className="bg-white border hairline-2 rounded-lg overflow-hidden">
                    <div className="h-14 ph"></div>
                    <div className="p-2"><div className="text-[10.5px] font-bold">BURGER/CO</div><div className="text-[9px] text-black/55 mono">20–30 min</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      
        {/* Chapter III — Menu QR */}
        <article className="border-t hairline">
          <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-8 py-16 items-center">
            <div className="col-span-12 md:col-span-3">
              <div className="font-display roman">III</div>
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="eyebrow mb-3">Superficie · Menú QR</div>
              <h3 className="font-display text-[44px] leading-[0.95] tracking-[-0.04em]">El menú vive<br/>en su mesa.</h3>
              <p className="mt-5 text-[14.5px] text-black/65 leading-[1.55] font-medium-tight max-w-md">
                QR estático por mesa. Foto, descripción, alérgenos y modificadores. Carrito persistente y pago dividido.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm">
                <div>
                  <div className="big-num text-[28px]">87<span className="text-[16px] align-top">%</span></div>
                  <div className="text-[10.5px] text-black/55 mono mt-1">adopción</div>
                </div>
                <div>
                  <div className="big-num text-[28px]">+32<span className="text-[16px] align-top">%</span></div>
                  <div className="text-[10.5px] text-black/55 mono mt-1">ticket</div>
                </div>
                <div>
                  <div className="big-num text-[28px]">0</div>
                  <div className="text-[10.5px] text-black/55 mono mt-1">papel</div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 flex justify-center">
              <div className="w-[200px] h-[300px] rounded-[28px] border-[6px] border-black bg-white overflow-hidden relative">
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-2 bg-black rounded-full"></div>
                <div className="pt-5 px-3.5">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-[14px] tracking-[-0.045em]">noon</div>
                    <span className="mono text-[9px] text-black/55">M.7</span>
                  </div>
                  <div className="text-[8.5px] text-black/55 mono">Para servir</div>
                  <div className="mt-3 flex gap-1.5">
                    <span className="px-2 h-5 inline-flex items-center bg-black text-white rounded-full text-[8.5px] font-bold">Tacos</span>
                    <span className="px-2 h-5 inline-flex items-center border hairline-2 rounded-full text-[8.5px]">Bebidas</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between border-b hairline-2 pb-2">
                      <div>
                        <div className="text-[10.5px] font-bold">Taco al Pastor</div>
                        <div className="text-[8px] text-black/50 mono">Piña, cebolla, cilantro</div>
                        <div className="text-[10px] font-bold mt-0.5">$35.00</div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">+</div>
                    </div>
                    <div className="flex items-center justify-between border-b hairline-2 pb-2">
                      <div>
                        <div className="text-[10.5px] font-bold">Suadero</div>
                        <div className="text-[8px] text-black/50 mono italic">Recomendado</div>
                        <div className="text-[10px] font-bold mt-0.5">$32.00</div>
                      </div>
                      <div className="w-6 h-6 rounded-full text-black flex items-center justify-center text-[12px] font-bold" style={{ background: '#BEEBBE' }}>+</div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 h-8 bg-black rounded-full flex items-center justify-between px-3 text-white text-[9.5px] font-bold">
                  <span>Ver carrito · 2</span><span>$67.00 →</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      
        {/* Chapter IV — Panel Admin (dark) */}
        <article className="border-t hairline bg-black text-white">
          <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-8 py-16 items-center">
            <div className="col-span-12 md:col-span-3">
              <div className="font-display roman" style={{ color: '#BEEBBE' }}>IV</div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="eyebrow mb-3" style={{ color: '#BEEBBE' }}>Superficie · Panel admin</div>
              <h3 className="font-display text-[44px] leading-[0.95] tracking-[-0.04em]">El cerebro<br/>del restaurante.</h3>
              <p className="mt-5 text-[14.5px] text-white/65 leading-[1.55] font-medium-tight max-w-md">
                Mesas, pedidos, KDS, caja, inventario, feedback. Un solo panel, una sola vista de operación.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] font-medium-tight">
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#BEEBBE', width: '5px', height: '5px' }}></span>Dashboard en vivo</li>
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#BEEBBE', width: '5px', height: '5px' }}></span>KDS por estación con SLA</li>
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#BEEBBE', width: '5px', height: '5px' }}></span>Turno & caja con corte automático</li>
                <li className="flex items-center gap-2"><span className="dot" style={{ background: '#BEEBBE', width: '5px', height: '5px' }}></span>Notas de venta, pagos pendientes</li>
              </ul>
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="border border-white/10 rounded-lg p-2.5">
                    <div className="mono text-[9px] text-white/50 uppercase">Ventas hoy</div>
                    <div className="font-display text-[18px] num mt-1">$12,840</div>
                    <div className="text-[9px] mono mt-0.5" style={{ color: '#BEEBBE' }}>↑ +18%</div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-2.5">
                    <div className="mono text-[9px] text-white/50 uppercase">Ticket</div>
                    <div className="font-display text-[18px] num mt-1">$487</div>
                    <div className="text-[9px] mono mt-0.5" style={{ color: '#BEEBBE' }}>↑ +12%</div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-2.5">
                    <div className="mono text-[9px] text-white/50 uppercase">M→C</div>
                    <div className="font-display text-[18px] num mt-1">11<span className="text-[10px]">s</span></div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-2.5">
                    <div className="mono text-[9px] text-white/50 uppercase">SLA</div>
                    <div className="font-display text-[18px] num mt-1">100<span className="text-[10px]">%</span></div>
                  </div>
                </div>
                <div className="mt-2 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="mono text-[10px] text-white/65 uppercase tracking-[0.16em]">Ventas / hora</div>
                    <div className="flex gap-1">
                      <span className="px-2 h-5 inline-flex items-center bg-white text-black rounded-full text-[9.5px] font-bold">Hoy</span>
                      <span className="px-2 h-5 inline-flex items-center text-white/55 text-[9.5px] mono">7d</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 320 70" className="w-full mt-2" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BEEBBE" stopOpacity="0.5"/>
                        <stop offset="100%" stopColor="#BEEBBE" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M0 55 L20 50 L40 52 L60 40 L80 42 L100 30 L120 35 L140 25 L160 28 L180 18 L200 22 L220 12 L240 15 L260 22 L280 18 L300 24 L320 14 L320 70 L0 70 Z" fill="url(#g1)"/>
                    <path d="M0 55 L20 50 L40 52 L60 40 L80 42 L100 30 L120 35 L140 25 L160 28 L180 18 L200 22 L220 12 L240 15 L260 22 L280 18 L300 24 L320 14" fill="none" stroke="#BEEBBE" strokeWidth="1.8"/>
                  </svg>
                </div>
                {/* mini KDS */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="border border-white/10 rounded-lg p-2.5">
                    <div className="flex items-center justify-between"><span className="text-[10px] font-bold">#47 · M3</span><span className="text-[9px] mono mint mint-fg px-1.5 rounded">02:14</span></div>
                    <div className="text-[9px] text-white/55 mono mt-1">Pastor · Suadero</div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-2.5" style={{ borderColor: '#FBBF24' }}>
                    <div className="flex items-center justify-between"><span className="text-[10px] font-bold">#48 · M7</span><span className="text-[9px] mono px-1.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>06:42</span></div>
                    <div className="text-[9px] text-white/55 mono mt-1">Burger · Papas</div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-2.5">
                    <div className="flex items-center justify-between"><span className="text-[10px] font-bold">#49 · QR</span><span className="text-[9px] mono px-1.5 rounded bg-white text-black">00:08</span></div>
                    <div className="text-[9px] text-white/55 mono mt-1">Sushi · Edamame</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      
        {/* Chapter V — App consumidor */}
        <article className="border-t hairline">
          <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-8 py-16 items-center">
            <div className="col-span-12 md:col-span-4 md:order-2 md:text-right">
              <div className="font-display roman">V</div>
            </div>
            <div className="col-span-12 md:col-span-5 md:order-1">
              <div className="eyebrow mb-3">Superficie · App del consumidor</div>
              <h3 className="font-display text-[44px] leading-[0.95] tracking-[-0.04em]">Wallet, pedidos,<br/>perfil. Tuyo.</h3>
              <p className="mt-5 text-[14.5px] text-black/65 leading-[1.55] font-medium-tight max-w-md">
                El comensal vuelve. Su saldo, sus restaurantes favoritos, su historial, su feedback — todo en una sola app blanca.
              </p>
              <div className="mt-7 leader pb-2 mono text-[12px] flex items-baseline">
                <span className="font-bold">Saldo wallet promedio</span>
                <span className="mx-2 flex-1"></span>
                <span className="font-bold">$1,240</span>
              </div>
              <div className="mt-2 leader pb-2 mono text-[12px] flex items-baseline">
                <span className="font-bold">Frecuencia / cliente / mes</span>
                <span className="mx-2 flex-1"></span>
                <span className="font-bold">2.4×</span>
              </div>
            </div>
            <div className="col-span-12 md:col-span-3 md:order-3 md:col-start-9 flex justify-center">
              <div className="w-[200px] h-[300px] rounded-[28px] border-[6px] border-black bg-white overflow-hidden relative">
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-2 bg-black rounded-full"></div>
                <div className="pt-5 px-3.5">
                  <div className="mono text-[8.5px] text-black/55 uppercase tracking-[0.16em]">Saldo wallet</div>
                  <div className="font-display text-[32px] num tracking-[-0.045em] leading-none mt-1">$1,240</div>
                  <div className="text-[8.5px] text-black/55 mono mt-1">en 7 restaurantes</div>
                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    <div className="aspect-square rounded-md flex flex-col items-center justify-center" style={{ background: '#BEEBBE' }}>
                      <span className="text-[14px] font-bold">↗</span><span className="text-[7.5px] font-bold mt-0.5">Enviar</span>
                    </div>
                    <div className="aspect-square rounded-md bg-black text-white flex flex-col items-center justify-center">
                      <span className="text-[14px] font-bold">+</span><span className="text-[7.5px] font-bold mt-0.5">Cargar</span>
                    </div>
                    <div className="aspect-square rounded-md border-2 border-black flex flex-col items-center justify-center">
                      <span className="text-[14px] font-bold">⌗</span><span className="text-[7.5px] font-bold mt-0.5">QR</span>
                    </div>
                  </div>
                  <div className="mono text-[9px] text-black/45 uppercase tracking-[0.16em] mt-4">Actividad</div>
                  <div className="mt-1.5 space-y-2">
                    <div className="flex items-baseline leader pb-1">
                      <span className="text-[9.5px] font-bold">noon</span>
                      <span className="mx-1 flex-1"></span>
                      <span className="text-[9.5px] font-bold">−$248</span>
                    </div>
                    <div className="flex items-baseline leader pb-1">
                      <span className="text-[9.5px] font-bold">BURGER/CO</span>
                      <span className="mx-1 flex-1"></span>
                      <span className="text-[9.5px] font-bold">−$182</span>
                    </div>
                    <div className="flex items-baseline leader pb-1">
                      <span className="text-[9.5px] font-bold">SUSHI 88</span>
                      <span className="mx-1 flex-1"></span>
                      <span className="text-[9.5px] font-bold">−$324</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
      
      {/* ─────────────────── POR QUÉ ─────────────────── */}
      <section id="porque" className="border-b hairline py-28">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-12 gap-8 mb-16">
            <div className="col-span-12 lg:col-span-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="swiss-num">CAP. 04</span>
                <span className="h-px w-10 bg-black/30"></span>
                <span className="eyebrow">Por qué los restaurantes cambian</span>
              </div>
              <h2 className="font-display mega">
                No es <span className="strike-mint">otro</span><br/>POS más.
              </h2>
            </div>
          </div>
      
          <div className="grid grid-cols-12 gap-0 border-t hairline">
            {/* 01 */}
            <article className="col-span-12 md:col-span-4 border-r-0 md:border-r hairline border-b md:border-b-0 p-10">
              <div className="flex items-baseline justify-between mb-8">
                <span className="big-num text-[120px]">01</span>
                <span className="swiss-num">Velocidad</span>
              </div>
              <h3 className="font-display text-[32px] leading-[0.96] tracking-[-0.04em]">
                Cobra una mesa<br/>en <span className="hl-mint">11 segundos</span>.
              </h3>
              <p className="text-[14.5px] text-black/65 mt-5 leading-[1.55] font-medium-tight">
                QR a la mesa, pago dividido, propina automática, recibo al correo. Cero filas para pagar.
              </p>
              <div className="mt-8 mono text-[11px] text-black/55">
                <div className="flex items-baseline leader pb-1.5">
                  <span>Antes (mesero + TPV)</span><span className="mx-1 flex-1"></span><span className="font-bold">~4 min</span>
                </div>
                <div className="flex items-baseline leader pb-1.5 mt-2">
                  <span className="font-bold">Con WAITLESS</span><span className="mx-1 flex-1"></span><span className="font-bold text-[#0a3a0a]">11 s</span>
                </div>
              </div>
            </article>
      
            {/* 02 */}
            <article className="col-span-12 md:col-span-4 md:border-r hairline border-b md:border-b-0 p-10">
              <div className="flex items-baseline justify-between mb-8">
                <span className="big-num text-[120px]">02</span>
                <span className="swiss-num">White-label</span>
              </div>
              <h3 className="font-display text-[32px] leading-[0.96] tracking-[-0.04em]">
                Tu marca.<br/>Sin "Powered by".
              </h3>
              <p className="text-[14.5px] text-black/65 mt-5 leading-[1.55] font-medium-tight">
                Logo, colores, dominio, app. Tu cliente nunca ve a WAITLESS — solo a tu restaurante.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="border hairline rounded-lg p-2.5">
                  <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center text-[11px] font-bold">N</div>
                  <div className="text-[10.5px] font-bold mt-2">noon</div>
                  <div className="text-[9px] mono text-black/45">noon.menu</div>
                </div>
                <div className="border hairline rounded-lg p-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-black" style={{ background: '#BEEBBE' }}>B</div>
                  <div className="text-[10.5px] font-bold mt-2">BURGER/CO</div>
                  <div className="text-[9px] mono text-black/45">burgerco.app</div>
                </div>
                <div className="border hairline rounded-lg p-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#1a1a1a] text-white flex items-center justify-center text-[11px] font-bold">S</div>
                  <div className="text-[10.5px] font-bold mt-2">SUSHI 88</div>
                  <div className="text-[9px] mono text-black/45">sushi88.mx</div>
                </div>
              </div>
            </article>
      
            {/* 03 */}
            <article className="col-span-12 md:col-span-4 p-10">
              <div className="flex items-baseline justify-between mb-8">
                <span className="big-num text-[120px]">03</span>
                <span className="swiss-num">Datos</span>
              </div>
              <h3 className="font-display text-[32px] leading-[0.96] tracking-[-0.04em]">
                Cada plato.<br/>Cada minuto.
              </h3>
              <p className="text-[14.5px] text-black/65 mt-5 leading-[1.55] font-medium-tight">
                SLA por estación, rotación, items rentables vs. ruido. Decisiones reales, no intuición.
              </p>
              <div className="mt-8 space-y-2">
                <div className="flex items-baseline leader pb-1.5 mono text-[11px]">
                  <span>Top plato (Pastor)</span><span className="mx-1 flex-1"></span><span className="font-bold">142 / día</span>
                </div>
                <div className="flex items-baseline leader pb-1.5 mono text-[11px]">
                  <span>Hora pico</span><span className="mx-1 flex-1"></span><span className="font-bold">14:00–15:30</span>
                </div>
                <div className="flex items-baseline leader pb-1.5 mono text-[11px]">
                  <span>Rotación / mesa</span><span className="mx-1 flex-1"></span><span className="font-bold">3.2 turnos</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
      
      {/* ─────────────────── TESTIMONIAL + STATS (black) ─────────────────── */}
      <section id="clientes" className="bg-black text-white py-32 relative overflow-hidden grain">
        <div className="max-w-[1440px] mx-auto px-8 relative">
          <div className="flex items-center gap-3 mb-12">
            <span className="swiss-num" style={{ color: '#909090' }}>CAP. 05</span>
            <span className="h-px w-10 bg-white/30"></span>
            <span className="eyebrow text-white">340+ restaurantes ya operan</span>
          </div>
      
          <blockquote className="font-display tracking-[-0.04em] leading-[0.96] max-w-[1200px]" style={{ fontSize: 'clamp(40px, 6.6vw, 116px)' }}>
            <span className="text-white/30">&ldquo;</span>Pasamos de <span className="num">22</span> a <span className="num" style={{ color: '#BEEBBE' }}>11</span> minutos mesa→cobro.
            Sin contratar a nadie más.<span className="text-white/30">&rdquo;</span>
          </blockquote>
      
          <div className="mt-14 grid grid-cols-12 gap-8 items-end">
            <div className="col-span-12 md:col-span-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full ph-dark border border-white/15"></div>
                <div>
                  <div className="text-[16px] font-bold">Daniela Reyes</div>
                  <div className="text-[12.5px] text-white/55 font-medium-tight">Operaciones · noon · CDMX</div>
                  <div className="text-[11.5px] text-white/45 mono mt-0.5">3 sucursales · 38 mesas · usuario desde 2024</div>
                </div>
              </div>
            </div>
      
            <div className="col-span-12 md:col-span-7 grid grid-cols-2 md:grid-cols-4 gap-6 md:border-l border-white/15 md:pl-8">
              <div>
                <div className="big-num text-[40px] md:text-[52px]">340<span style={{ color: '#BEEBBE' }}>+</span></div>
                <div className="text-[11px] text-white/55 mono mt-2 uppercase tracking-[0.16em]">restaurantes</div>
              </div>
              <div>
                <div className="big-num text-[40px] md:text-[52px]">$8.4<span className="text-[22px] md:text-[28px] align-top" style={{ color: '#BEEBBE' }}>M</span></div>
                <div className="text-[11px] text-white/55 mono mt-2 uppercase tracking-[0.16em]">/ mes proc.</div>
              </div>
              <div>
                <div className="big-num text-[40px] md:text-[52px]">11<span className="text-[22px] md:text-[28px] align-top">s</span></div>
                <div className="text-[11px] text-white/55 mono mt-2 uppercase tracking-[0.16em]">cobro avg</div>
              </div>
              <div>
                <div className="big-num text-[40px] md:text-[52px]" style={{ color: '#BEEBBE' }}>99.98<span className="text-[22px] md:text-[28px] align-top">%</span></div>
                <div className="text-[11px] text-white/55 mono mt-2 uppercase tracking-[0.16em]">uptime 90d</div>
              </div>
            </div>
          </div>
      
          {/* logo wall */}
          <div className="mt-20 pt-10 border-t border-white/15">
            <div className="mono text-[10.5px] text-white/45 uppercase tracking-[0.18em] mb-6">— Operando con WAITLESS</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-10 font-display text-[26px] tracking-[-0.045em]">
              <span>noon</span>
              <span>La Esquina</span>
              <span>BURGER/CO</span>
              <span>SUSHI 88</span>
              <span>Café Otro</span>
              <span>El Refugio</span>
              <span>Tacos Norte</span>
              <span>POLLO ROJO</span>
              <span>Vinos & Co</span>
              <span>Mariscos del Pacífico</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* ─────────────────── CARTA DE PLANES (restaurant menu style) ─────────────────── */}
      <section id="precios" className="paper py-28 border-b hairline relative overflow-hidden">
        <div className="max-w-[1080px] mx-auto px-8 relative">
          {/* menu header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="h-px w-10 bg-black/30"></span>
              <span className="swiss-num">CAP. 06</span>
              <span className="h-px w-10 bg-black/30"></span>
            </div>
            <h2 className="font-display tracking-[-0.04em] leading-[0.95]" style={{ fontSize: 'clamp(48px, 7.5vw, 112px)' }}>
              Carta de planes
            </h2>
            <div className="mt-3 mono text-[12.5px] text-black/55 uppercase tracking-[0.22em]">— Servido fresco, sin sorpresas —</div>
          </div>
      
          {/* menu rows */}
          <div className="space-y-12">
      
            {/* Starter */}
            <div className="grid grid-cols-12 gap-6 items-baseline">
              <div className="col-span-1 mono text-[11px] text-black/45 num">i.</div>
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-baseline gap-3">
                  <div className="font-display text-[34px] tracking-[-0.04em]">Starter</div>
                  <div className="leader flex-1 pb-2 hidden md:block"></div>
                </div>
                <div className="text-[14px] text-black/65 mt-1 max-w-md font-medium-tight italic">
                  Para tu primera sucursal. Menú QR, mesas, comandero, pago dividido. Hasta 8 mesas.
                </div>
                <div className="mt-3 mono text-[11px] text-black/55 flex flex-wrap gap-x-4 gap-y-1">
                  <span>· Menú QR ilimitado</span>
                  <span>· Pago dividido</span>
                  <span>· Soporte por email</span>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 md:col-start-9 md:text-right">
                <div className="font-display text-[44px] num leading-none">$29<span className="text-[16px] text-black/55 font-medium-tight ml-1">/ mes</span></div>
                <a href="/registro" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold hover-line">Empezar gratis <span className="arr">→</span></a>
              </div>
            </div>
      
            <div className="leader h-3"></div>
      
            {/* Pro */}
            <div className="grid grid-cols-12 gap-6 items-baseline relative md:pt-9">
              <div className="absolute left-0 top-0 chip-data hidden md:inline-block">Recomendado por el chef</div>
              <div className="col-span-1 mono text-[11px] text-black/45 num">ii.</div>
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-baseline gap-3">
                  <div className="font-display text-[34px] tracking-[-0.04em]">Pro</div>
                  <span className="chip-data md:hidden">★</span>
                  <div className="leader flex-1 pb-2 hidden md:block"></div>
                </div>
                <div className="text-[14px] text-black/65 mt-1 max-w-md font-medium-tight italic">
                  La operación completa. KDS multiestación, marketplace público, white-label, analítica avanzada.
                </div>
                <div className="mt-3 mono text-[11px] text-black/55 flex flex-wrap gap-x-4 gap-y-1">
                  <span>· Todo en Starter</span>
                  <span>· KDS + SLA</span>
                  <span>· Marketplace</span>
                  <span>· White-label</span>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 md:col-start-9 md:text-right">
                <div className="font-display text-[44px] num leading-none">$89<span className="text-[16px] text-black/55 font-medium-tight ml-1">/ mes</span></div>
                <a href="/registro" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold hover-line">Empezar gratis <span className="arr">→</span></a>
              </div>
            </div>
      
            <div className="leader h-3"></div>
      
            {/* Cadenas */}
            <div className="grid grid-cols-12 gap-6 items-baseline">
              <div className="col-span-1 mono text-[11px] text-black/45 num">iii.</div>
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-baseline gap-3">
                  <div className="font-display text-[34px] tracking-[-0.04em]">Cadenas</div>
                  <div className="leader flex-1 pb-2 hidden md:block"></div>
                </div>
                <div className="text-[14px] text-black/65 mt-1 max-w-md font-medium-tight italic">
                  Para grupos de 5+ sucursales. Roles, API, webhooks, SLA dedicado, onboarding asistido.
                </div>
                <div className="mt-3 mono text-[11px] text-black/55 flex flex-wrap gap-x-4 gap-y-1">
                  <span>· Todo en Pro</span>
                  <span>· Multi-sucursal</span>
                  <span>· API + webhooks</span>
                  <span>· SLA dedicado</span>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 md:col-start-9 md:text-right">
                <div className="font-display text-[34px] tracking-[-0.04em] leading-none italic text-black/70">A medida</div>
                <a href="mailto:demo@waitless.app" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold hover-line">Agendar demo <span className="arr">→</span></a>
              </div>
            </div>
      
          </div>
      
          {/* menu footer */}
          <div className="mt-20 pt-8 border-t border-dashed border-black/30 grid grid-cols-1 md:grid-cols-3 gap-6 mono text-[11.5px] text-black/65">
            <div><span className="text-black font-bold">14 días gratis</span> · sin tarjeta de crédito</div>
            <div className="text-center"><span className="text-black font-bold">Setup en 7 min</span> · onboarding incluido</div>
            <div className="md:text-right"><span className="text-black font-bold">Soporte humano</span> · 7 días, no bots</div>
          </div>
        </div>
      </section>
      
      {/* ─────────────────── CTA FINAL — sello W ─────────────────── */}
      <section className="border-b hairline py-32 relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="swiss-num">CAP. 07</span>
              <span className="h-px w-10 bg-black/30"></span>
              <span className="eyebrow">Tu próximo turno</span>
            </div>
            <h2 className="font-display leading-[0.92] tracking-[-0.045em]" style={{ fontSize: 'clamp(56px, 9vw, 140px)' }}>
              Empieza<br/>distinto.<br/>
              <span className="text-black/30">Hoy.</span>
            </h2>
            <p className="text-[17px] text-black/65 mt-7 max-w-[520px] font-medium-tight">
              Setup en 7 minutos. Sin tarjeta. Sin compromiso. Mide tu primer cierre de caja con WAITLESS esta semana.
            </p>
            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <a href="/registro" className="inline-flex items-center gap-2 h-12 px-6 bg-black text-white rounded-full text-[15px] font-bold">
                Comenzar gratis <span className="arr">→</span>
              </a>
              <a href="mailto:ventas@waitless.app" className="inline-flex items-center gap-2 h-12 px-6 border hairline rounded-full text-[15px] font-medium-tight hover:border-black">
                Hablar con ventas
              </a>
              <div className="mono text-[11px] text-black/45 ml-2">o agenda demo · 14 may libre 16:00</div>
            </div>
          </div>
      
          {/* GIANT W STAMP */}
          <div className="col-span-12 md:col-span-5 flex justify-center md:justify-end">
            <div className="relative">
              <div className="stamp" style={{ width: '340px', height: '340px', fontSize: '240px', background: '#000', color: '#fff', border: 'none' }}>W</div>
              {/* corner marks */}
              <span className="absolute -top-3 -left-3 mono text-[10px] text-black/45 uppercase tracking-[0.18em]">+ Sello</span>
              <span className="absolute -bottom-3 -right-3 mono text-[10px] text-black/45 uppercase tracking-[0.18em]">v10 · LATAM</span>
              {/* mint dot bottom-right */}
              <span className="absolute -bottom-4 -left-4 chip-data live-dot">EN VIVO</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer className="bg-white py-16">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-5">
              <div className="flex items-center gap-2.5">
                <span className="w-logo lg">W</span>
                <span className="font-display text-[26px] tracking-[-0.045em]">WAITLESS</span>
                <span className="mono text-[10px] text-black/40 uppercase tracking-[0.16em]">v10.2</span>
              </div>
              <p className="text-[14px] text-black/60 mt-5 max-w-[400px] font-medium-tight">
                Plataforma operativa white-label para restaurantes. De la mesa al cobro, sin fricciones.
              </p>
              <div className="mt-7 flex items-center gap-2">
                <a href="#" className="w-9 h-9 rounded-full border hairline flex items-center justify-center hover:border-black"><span className="text-[12px] font-bold">X</span></a>
                <a href="#" className="w-9 h-9 rounded-full border hairline flex items-center justify-center hover:border-black"><span className="text-[12px] font-bold">in</span></a>
                <a href="#" className="w-9 h-9 rounded-full border hairline flex items-center justify-center hover:border-black"><span className="text-[12px] font-bold">ig</span></a>
              </div>
            </div>
            <div className="col-span-6 md:col-span-2">
              <div className="eyebrow eyebrow-mute mb-4">Producto</div>
              <ul className="space-y-2.5 text-[13.5px] text-black/65 font-medium-tight">
                <li><a href="#superficies" className="hover:text-black">Cinco superficies</a></li>
                <li><a href="#precios" className="hover:text-black">Carta de planes</a></li>
                <li><a href="/explore" className="hover:text-black">Marketplace</a></li>
                <li><a href="#" className="hover:text-black">API & webhooks</a></li>
                <li><a href="#" className="hover:text-black">Changelog</a></li>
              </ul>
            </div>
            <div className="col-span-6 md:col-span-2">
              <div className="eyebrow eyebrow-mute mb-4">Negocio</div>
              <ul className="space-y-2.5 text-[13.5px] text-black/65 font-medium-tight">
                <li><a href="#clientes" className="hover:text-black">Clientes</a></li>
                <li><a href="#" className="hover:text-black">Casos de éxito</a></li>
                <li><a href="#" className="hover:text-black">Partners</a></li>
                <li><a href="#" className="hover:text-black">Prensa</a></li>
                <li><a href="mailto:hola@waitless.app" className="hover:text-black">Contacto</a></li>
              </ul>
            </div>
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow eyebrow-mute mb-4">Notas de turno</div>
              <div className="text-[13.5px] text-black/65 mb-3 font-medium-tight">1× al mes. Producto, métricas, lecciones operativas.</div>
              <form className="flex items-center gap-1 border hairline rounded-full p-1 max-w-sm focus-within:border-black">
                <input type="email" placeholder="tu@correo.com" className="flex-1 bg-transparent outline-none px-3 h-9 text-[13.5px] font-medium-tight"/>
                <button type="button" className="h-9 px-4 bg-black text-white rounded-full text-[12.5px] font-bold">Suscribirme</button>
              </form>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t hairline flex items-center justify-between text-[12px] text-black/45 font-medium-tight flex-wrap gap-3">
            <div className="mono">© 2026 WAITLESS Labs · Hecho en CDMX · Servido en LATAM</div>
            <div className="flex items-center gap-5 mono">
              <a href="/legal/terminos" className="hover:text-black">Términos</a>
              <a href="/legal/privacidad" className="hover:text-black">Privacidad</a>
              <a href="/legal/cookies" className="hover:text-black">Cookies</a>
              <span>v10.2 · build 481</span>
            </div>
          </div>
        </div>
      </footer>
      
      
    </main>
  )
}
