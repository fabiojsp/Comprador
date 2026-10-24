'use client';

import { useEffect, useState } from 'react';
import { writeLocal } from '@/lib/storage';

export const SHORTCUT_READY_KEY = 'cesta.atajo.listo.v1';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="mt-2 w-full rounded-xl bg-ink px-4 py-3 font-semibold text-paper"
    >
      {done ? 'Copiado ✓' : label}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-line bg-card p-4">
      <p className="font-mono text-xs text-muted">PASO {n}</p>
      <h2 className="mt-1 font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed">{children}</div>
    </li>
  );
}

export function ShortcutGuide({ script }: { script: string }) {
  const [endpoint, setEndpoint] = useState('');
  useEffect(() => setEndpoint(`${window.location.origin}/api/atajo`), []);
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)]">
      <a href="/" className="text-sm font-semibold text-clay">← Volver a Cesta</a>
      <h1 className="mt-3 text-2xl font-semibold">Atajo para Carrefour y Eroski</h1>
      <p className="mt-2 text-muted">
        Carrefour y Eroski no dejan consultar sus precios desde servidores. Este atajo los consulta desde tu iPhone, con tu conexión,
        como si buscaras tú, y envía los resultados a Cesta. Se configura una vez (5 minutos).
      </p>

      <ol className="mt-6 space-y-3">
        <Step n={1} title="Crea el atajo">
          <p>Abre la app <b>Atajos</b> → pestaña <b>Atajos</b> → botón <b>+</b>. Ponle de nombre <b>Cesta precios</b>.</p>
          <p>Pulsa el icono <b>ⓘ</b> (abajo) y activa <b>Mostrar en hoja de compartir</b>. En los tipos que recibe, deja solo <b>Páginas web de Safari</b>.</p>
        </Step>
        <Step n={2} title="Acción «Ejecutar JavaScript en la página web»">
          <p>Pulsa <b>Añadir acción</b>, busca <b>Ejecutar JavaScript en la página web</b> y añádela. Debe decir «en <i>Entrada del atajo</i>».</p>
          <p>Borra el código de ejemplo y pega este:</p>
          <CopyButton text={script} label="Copiar código del atajo" />
        </Step>
        <Step n={3} title="Acción «Obtener contenido de URL»">
          <p>Añade <b>Obtener contenido de URL</b> y en la dirección pega:</p>
          <p className="break-all rounded-lg bg-paper px-3 py-2 font-mono text-sm">{endpoint || '…/api/atajo'}</p>
          <CopyButton text={endpoint} label="Copiar dirección" />
          <p>Pulsa <b>Mostrar más</b>: Método <b>POST</b> · Cuerpo de la solicitud <b>Archivo</b> · en Archivo elige la variable <b>Resultado de JavaScript</b>.</p>
        </Step>
        <Step n={4} title="Acción «Mostrar resultado»">
          <p>Añade <b>Mostrar resultado</b>. Así verás si los precios llegaron bien. Pulsa <b>OK</b> para guardar el atajo.</p>
        </Step>
        <Step n={5} title="Cómo se usa">
          <p>En Cesta → Comparar, pulsa <b>Leer precios</b> en Carrefour o Eroski. Se abre la tienda en Safari.</p>
          <p>Si sale una comprobación de seguridad, espera a que cargue la tienda. Luego pulsa <b>Compartir</b> → <b>Cesta precios</b>.</p>
          <p>La primera vez te pedirá permiso para ejecutarse en la web de la tienda: pulsa <b>Permitir</b>. Tarda alrededor de 1 minuto. Cuando veas ✅, vuelve a Cesta.</p>
        </Step>
      </ol>

      <button
        type="button"
        onClick={() => {
          writeLocal(SHORTCUT_READY_KEY, true);
          window.location.href = '/';
        }}
        className="mt-6 w-full rounded-2xl bg-clay px-4 py-4 text-lg font-semibold text-clay-ink"
      >
        Ya tengo el atajo
      </button>
      <p className="mt-3 text-center text-xs text-muted">El atajo no inicia sesión, no compra ni resuelve comprobaciones por ti.</p>
    </main>
  );
}
