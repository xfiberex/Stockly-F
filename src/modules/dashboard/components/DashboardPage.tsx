import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowsRightLeftIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, InboxArrowDownIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { conSimboloDeMoneda, formatearImporte } from "@/shared/lib/moneda";
import { useReports } from "@/modules/reports/hooks/useReports";
import type { ReportSummary } from "@/modules/reports/types/reports.types";
import { Barra, ZonaCargando } from "@/shared/components/Esqueleto";
import { Spinner } from "@/shared/components/Spinner";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import { useT } from "@/shared/hooks/useIdioma";
import { useFalloDeCarga, useReintentarFallidas } from "@/shared/hooks/useFalloDeCarga";
import type { Clave } from "@/shared/i18n/traducir";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { cn } from "@/shared/lib/cn";
import { formatearDia, formatearHora, partesDelDia } from "@/shared/lib/fechas";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { AtencionDeHoy } from "./AtencionDeHoy";
import { DESTINOS } from "../destinos";
import { PanelDeVendedor } from "./PanelDeVendedor";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { FilaDeAtencion } from "../hooks/useAtencionDeHoy";

type Rol = "ADMIN" | "USER" | "WAREHOUSE";

/**
 * Qué ve cada rol en el panel. Cada uno abre Stockly para un trabajo distinto: quien está en el
 * almacén necesita caducidades y conteos, no el margen; quien compra y vende, sus órdenes.
 * SELLER no está aquí: tiene su propio panel (`PanelDeVendedor`).
 *
 * AUD-008, paso 9 — **un panel «de hoy» por rol.** Para USER y WAREHOUSE el panel es lo
 * pendiente: el resumen del negocio —recuentos del catálogo, importes, ventas de la semana— está
 * en Reportes, y aquí solo lo ve ADMIN. WAREHOUSE abre además con sus acciones, la primera
 * escanear: es quien trabaja de pie con el móvil, y antes todo pasaba por el menú de arriba.
 */
const PANEL: Record<Rol, { atencion: readonly FilaDeAtencion[]; resumen: boolean; almacen: boolean }> = {
    ADMIN: { atencion: ["stock", "caducidades", "conteos", "compras", "ventas"], resumen: true, almacen: false },
    USER: { atencion: ["stock", "compras", "ventas"], resumen: false, almacen: false },
    WAREHOUSE: { atencion: ["stock", "caducidades", "conteos", "compras"], resumen: false, almacen: true },
};

export default function DashboardPage() {
    const { t } = useT();
    const { user } = useAuth();

    if (user?.role === "SELLER") {
        return (
            <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.dashboard")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("dashboard.vendedor.subtitulo")}</p>
                </div>
                <PanelDeVendedor email={user.email} />
            </div>
        );
    }

    // Un rol que no está en la tabla —no debería llegar ninguno con sesión— ve lo mínimo, no lo de ADMIN.
    const rol: Rol = user?.role === "ADMIN" || user?.role === "WAREHOUSE" ? user.role : "USER";
    return <PanelGeneral rol={rol} />;
}

function PanelGeneral({ rol }: { rol: Rol }) {
    const { t, idioma } = useT();
    const informe = useReports();
    const { data, isError, isFetching, dataUpdatedAt } = informe;
    const panel = PANEL[rol];

    // AUD-008, paso 8 — la página ya no se cambia entera por un esqueleto mientras `/reports`
    // carga o se reintenta. Antes, sin sus datos, `EsqueletoPagina` sustituía todo: al pulsar
    // «Reintentar» (TanStack v5 vuelve a `pending`) desaparecían el aviso y «Necesita atención»,
    // el foco caía en `<body>`, y las cifras de atención esperaban al informe para empezar a
    // pedirse. Ahora la estructura está desde el principio y solo espera lo que sale de él.
    const { fallo, error } = useFalloDeCarga(informe);
    const reintentar = useReintentarFallidas();
    const cargando = !data && !fallo;

    // Si el aviso se va porque el reintento salió bien, el botón que tenía el foco desaparece con
    // él: el foco vuelve al título en vez de perderse en `<body>`.
    const titulo = useRef<HTMLHeadingElement>(null);
    const falloAntes = useRef(fallo);
    useEffect(() => {
        if (falloAntes.current && !fallo && (document.activeElement === document.body || document.activeElement === null)) {
            titulo.current?.focus();
        }
        falloAntes.current = fallo;
    }, [fallo]);

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
            <div>
                <h1 ref={titulo} tabIndex={-1} className="text-2xl font-bold text-foreground focus:outline-none">
                    {t("ruta.dashboard")}
                </h1>
                {/* AUD-008, paso 6: queda solo lo que informa: de cuándo son los datos. La línea
                    reserva su alto mientras carga, para que lo de debajo no baje al llegar. */}
                <p className="text-sm text-foreground-muted mt-1 min-h-5">
                    {/* Con datos ya en pantalla, una actualización fallida no los borra: se avisa
                        de que son los de antes y de cuándo, y se puede volver a intentar. La región
                        `status` está siempre montada —una que nace ya con texto no se anuncia— y
                        solo lleva el aviso: la hora de cada actualización buena no se lee en voz alta. */}
                    <span role="status">
                        {data && isError && (
                            <span className="text-warning">
                                {t("dashboard.noActualizado", { hora: formatearHora(idioma, dataUpdatedAt) })}{" "}
                                <ReintentoEnLinea onReintentar={reintentar} reintentando={isFetching} />
                            </span>
                        )}
                    </span>
                    {data && !isError && (
                        <span className="tabular-nums">{t("dashboard.actualizado", { hora: formatearHora(idioma, dataUpdatedAt) })}</span>
                    )}
                </p>
            </div>

            {panel.almacen && <AccionesDeAlmacen />}

            {/* Lo primero, lo que pide actuar hoy. Solo su fila de stock sale de `/reports`. */}
            <AtencionDeHoy
                filas={panel.atencion}
                stock={{ valor: data?.totals.lowStockCount ?? null, cargando, error: fallo }}
                lowStockProducts={data ? data.lowStockProducts : fallo ? [] : null}
            />

            {fallo ? (
                // El aviso se queda montado mientras se reintenta (`useFalloDeCarga`).
                <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                    <ErrorDeCarga titulo={t("dashboard.error.titulo")} error={error} onReintentar={reintentar} reintentando={isFetching} />
                </div>
            ) : panel.resumen ? (
                data ? <ResumenDeNegocio data={data} /> : <EsqueletoResumen />
            ) : null}
        </div>
    );
}

/**
 * El «Reintentar» que va junto a la hora cuando una actualización falla. AUD-008, paso 8: era un
 * texto de 69×20 px que no decía nada mientras trabajaba. Ahora tiene el mínimo táctil, se marca
 * ocupado con su rueda y no se desactiva —desactivado soltaría el foco—.
 */
function ReintentoEnLinea({ onReintentar, reintentando }: { onReintentar: () => void; reintentando: boolean }) {
    const { t } = useT();
    return (
        <button
            type="button"
            onClick={() => {
                if (!reintentando) onReintentar();
            }}
            aria-busy={reintentando || undefined}
            aria-disabled={reintentando || undefined}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg align-middle font-medium text-info hover:underline md:pointer-fine:min-h-0"
        >
            {reintentando && <Spinner size="sm" decorativo className="border-current border-t-transparent" />}
            {t("errorDeCarga.reintentar")}
        </button>
    );
}

/**
 * AUD-008, paso 9 — lo que hace quien está en el almacén, a un toque. Escanear abre Productos
 * con la cámara: el producto, su stock por almacén, sus lotes y sus movimientos. Va a todo lo
 * ancho y alto en móvil, en vez de detrás de la hamburguesa de arriba.
 */
function AccionesDeAlmacen() {
    const { t } = useT();
    const secundarias = [
        { to: DESTINOS.compras, texto: "dashboard.almacen.recibir", Icon: InboxArrowDownIcon },
        { to: "/inventory-counts", texto: "dashboard.almacen.conteos", Icon: ClipboardDocumentCheckIcon },
        { to: "/stock-transfers", texto: "dashboard.almacen.transferencias", Icon: ArrowsRightLeftIcon },
    ] as const;

    return (
        <section aria-labelledby="en-el-almacen" className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <h2 id="en-el-almacen" className="text-base font-semibold text-foreground">{t("dashboard.almacen.titulo")}</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                <div>
                    <Link to="/catalog/products?escanear=1" className={clasesDeBoton("primary", "w-full min-h-12 text-base")}>
                        <ViewfinderCircleIcon className="h-5 w-5" aria-hidden="true" />
                        {t("dashboard.almacen.escanear")}
                    </Link>
                    <p className="mt-1.5 text-xs text-foreground-muted">{t("dashboard.almacen.escanear.ayuda")}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 lg:contents">
                    {secundarias.map(({ to, texto, Icon }) => (
                        <Link key={to} to={to} className={clasesDeBoton("secondary", "w-full min-w-0 flex-col gap-1 px-2 sm:flex-row sm:gap-2 lg:self-start")}>
                            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <span className="text-center text-xs leading-tight sm:text-sm">{t(texto)}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Mientras llega `/reports`: la forma del resumen de ADMIN, nada de lo de arriba. */
function EsqueletoResumen() {
    return (
        <ZonaCargando className="space-y-6">
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2 px-3 py-3 sm:px-6 sm:py-4">
                        <Barra className="h-5 w-10" />
                        <Barra className="h-3 w-20" />
                    </div>
                ))}
            </div>
            <div className="h-48 rounded-xl border border-border bg-surface" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="h-96 rounded-xl border border-border bg-surface lg:col-span-2" />
                <div className="h-64 rounded-xl border border-border bg-surface" />
            </div>
        </ZonaCargando>
    );
}

/** `12k`, `1.5M`: el eje Y en corto. Con `M`, porque `$1500k` no se lee de un vistazo. */
function abreviarImporte(valor: number): string {
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(valor >= 10_000_000 ? 0 : 1)}M`;
    if (valor >= 1000) return `${(valor / 1000).toFixed(valor >= 10_000 ? 0 : 1)}k`;
    return String(valor);
}

/** El texto de los ejes, con los tokens del sistema: el `#666` de Recharts daba 2,94:1 en oscuro. */
const TEXTO_DE_EJE = { fontSize: 12, fill: "var(--color-foreground-muted)" } as const;

/** El resumen del negocio: solo ADMIN (`PANEL`). */
function ResumenDeNegocio({ data }: { data: ReportSummary }) {
    const { t, tn, idioma } = useT();
    const { totals, salesByDay, topSold } = data;
    const ventasDeLaSemana = salesByDay.reduce((suma, d) => suma + d.orders, 0);
    const importeDeLaSemana = salesByDay.reduce((suma, d) => suma + d.revenue, 0);
    // Los días llegan del más antiguo a hoy, en el calendario del negocio (T6-09).
    const hoy = salesByDay.at(-1)?.day;

    // AUD-008, paso 5 (`quieter`): eran cuatro tarjetas de colores para cifras que no son
    // estados. Quedan tres recuentos del catálogo, neutros, en una franja: dicen qué hay, no qué
    // hacer. Paso 9: cada uno lleva a la lista que cuenta —el total incluye los inactivos— y
    // paso 10: las categorías son las del catálogo, no los grupos de stock (12 con «Sin categoría»).
    const catalogo: { label: Clave; value: number; to: string }[] = [
        { label: "dashboard.totalProductos", value: totals.totalProducts, to: "/catalog/products?activos=todos" },
        { label: "dashboard.productosActivos", value: totals.activeProducts, to: "/catalog/products" },
        { label: "ruta.categorias", value: totals.categoryCount, to: "/catalog/categories" },
    ];
    const importes: { clave: Clave; valor: number; ayuda?: Clave }[] = [
        { clave: "dashboard.valorACoste", valor: totals.inventoryCostValue },
        { clave: "dashboard.valorInventario", valor: totals.inventoryValue },
        // Paso 6: el margen no es «venta menos coste» de las otras dos cifras —la de venta
        // incluye los productos sin coste—, así que dice qué cuenta.
        { clave: "dashboard.margenPotencial", valor: totals.potentialMargin, ayuda: "dashboard.margenPotencial.ayuda" },
    ];

    return (
        <>
            {/* Tres columnas también en móvil: con dos, la tercera se quedaba sola en una fila.
                Paso 9: cifras más pequeñas que las de «Necesita atención», que piden actuar. */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
                {catalogo.map(({ label, value, to }) => (
                    // Arriba y no centradas: a 390 px «Productos activos» parte en dos líneas, y
                    // centrando, su cifra subía y dejaba de alinearse con las otras dos.
                    <Link key={label} to={to} className="group flex min-h-11 min-w-0 flex-col gap-0.5 px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-xl font-semibold tabular-nums text-foreground wrap-anywhere">{value}</span>
                        <span className="text-xs leading-tight text-foreground-muted group-hover:underline sm:text-sm">{t(label)}</span>
                    </Link>
                ))}
            </div>

            {/* Valor del inventario — T5-02: a coste y a precio de venta, cada uno con su nombre.
                Paso 8: con su encabezado; sin él, la navegación por encabezados lo saltaba y en
                el esquema quedaba bajo «Reponer primero». */}
            <section aria-labelledby="valor-del-inventario" className="bg-surface rounded-xl border border-border p-5 sm:p-6">
                <h2 id="valor-del-inventario" className="text-base font-semibold text-foreground">{t("dashboard.importes.titulo")}</h2>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {importes.map(({ clave, valor, ayuda }) => (
                        <div key={clave} className="min-w-0">
                            <dt className="text-sm text-foreground-muted">{t(clave)}</dt>
                            {/* Cifras tabulares: sin ellas cambiaban de ancho con cada actualización. */}
                            <dd className="text-xl font-semibold text-foreground tabular-nums wrap-anywhere">{formatearImporte(valor)}</dd>
                            {ayuda && <dd className="text-xs text-foreground-muted">{t(ayuda)}</dd>}
                        </div>
                    ))}
                </dl>
                <div className="mt-3 flex flex-col gap-x-4 gap-y-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    {/* Paso 10: el aviso, corto y con adónde ir a ponerles coste. */}
                    {totals.productsWithoutCost > 0 ? (
                        <p className="text-warning">
                            {tn("dashboard.sinCoste", totals.productsWithoutCost)}{" "}
                            {/* Enlace en línea, dentro de la frase: con el alto táctil separaba sus líneas
                                (WCAG 2.5.8 exime a los enlaces dentro de un texto). */}
                            <Link to="/catalog/products?aviso=sinCoste" className="font-medium text-info underline">
                                {t("dashboard.sinCoste.ver")}
                            </Link>
                        </p>
                    ) : (
                        <span />
                    )}
                    <Link to="/reports" className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-info hover:underline md:pointer-fine:min-h-9">
                        {t("dashboard.verReporte")}
                        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </section>

            {/* T6-09 — las ventas de la semana: siete días del negocio, del más antiguo a hoy, y
                los que no tuvieron ventas vienen a cero. `items-start`: «Más vendidos» mide lo
                que su lista, no lo que el gráfico (paso 12). */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                <section aria-labelledby="ventas-de-la-semana" className="bg-surface rounded-xl border border-border p-5 sm:p-6 lg:col-span-2">
                    <h2 id="ventas-de-la-semana" className="text-base font-semibold text-foreground">{t("dashboard.ventas.titulo")}</h2>
                    <p className="mt-1 text-sm text-foreground tabular-nums">
                        {tn("dashboard.ventas.total", ventasDeLaSemana, { importe: formatearImporte(importeDeLaSemana) })}
                    </p>
                    <p className="mb-6 text-xs text-foreground-muted">{t("dashboard.ventas.nota")}</p>
                    {/* El gráfico es para la vista; las mismas cifras van en una lista para quien
                        no lo ve. Paso 12: `accessibilityLayer={false}`, o el SVG recibía el foco
                        dentro de este `aria-hidden` y era una parada muda para el lector. */}
                    <div aria-hidden="true">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={salesByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} accessibilityLayer={false}>
                                {/* Solo líneas horizontales: en barras, las verticales son ruido. */}
                                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    interval={0}
                                    height={40}
                                    tickLine={false}
                                    axisLine={{ stroke: COLOR_DE_REJILLA }}
                                    tick={({ x, y, payload }) => {
                                        // Día de la semana y número en dos líneas; hoy, nombrado y
                                        // en el color del texto, no en el atenuado.
                                        const dia = String(payload.value);
                                        const { semana, numero } = partesDelDia(idioma, dia);
                                        const esHoy = dia === hoy;
                                        return (
                                            <text
                                                x={x}
                                                y={y}
                                                textAnchor="middle"
                                                fontSize={TEXTO_DE_EJE.fontSize}
                                                fontWeight={esHoy ? 600 : undefined}
                                                fill={esHoy ? "var(--color-foreground)" : TEXTO_DE_EJE.fill}
                                            >
                                                <tspan x={x} dy="0.9em">{esHoy ? t("dashboard.ventas.hoy") : semana}</tspan>
                                                <tspan x={x} dy="1.25em">{numero}</tspan>
                                            </text>
                                        );
                                    }}
                                />
                                <YAxis
                                    tick={TEXTO_DE_EJE}
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                    tickFormatter={(v: number) => conSimboloDeMoneda(abreviarImporte(v))}
                                />
                                <Tooltip
                                    contentStyle={ESTILO_DE_TOOLTIP}
                                    cursor={{ fill: "var(--color-surface-muted)" }}
                                    separator=": "
                                    labelFormatter={(dia) => formatearDia(idioma, String(dia))}
                                    formatter={(value) => [formatearImporte(Number(value)), t("dashboard.ventas.importe")]}
                                />
                                {/* Un día con ventas nunca se queda sin barra: junto a un pico de
                                    $361k, los $321 de hoy medían menos de un píxel. Los días a cero
                                    siguen sin ella. */}
                                <Bar
                                    dataKey="revenue"
                                    fill="var(--color-chart-1)"
                                    radius={[4, 4, 0, 0]}
                                    minPointSize={(valor) => ((valor ?? 0) > 0 ? 3 : 0)}
                                    name={t("dashboard.ventas.importe")}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="sr-only" aria-label={t("dashboard.ventas.porDia")}>
                        {salesByDay.map((d) => (
                            <li key={d.day}>
                                {tn("dashboard.ventas.delDia", d.orders, { dia: formatearDia(idioma, d.day), importe: formatearImporte(d.revenue) })}
                            </li>
                        ))}
                    </ul>
                </section>

                <section aria-labelledby="mas-vendidos" className="bg-surface rounded-xl border border-border p-5 sm:p-6">
                    <h2 id="mas-vendidos" className="text-base font-semibold text-foreground mb-4">{t("dashboard.masVendidos.titulo")}</h2>
                    {topSold.length === 0 ? (
                        <p className="text-sm text-foreground-muted">{t("dashboard.masVendidos.vacio")}</p>
                    ) : (
                        <ol className="space-y-3">
                            {topSold.map((p) => (
                                // El nombre es el congelado en la línea de venta, y no se repite
                                // en esta lista: el servidor agrupa por él. Con `title`: cortado, dos
                                // nombres que empiezan igual no se distinguían.
                                <li key={p.name} className="flex items-baseline justify-between gap-3 text-sm">
                                    <span title={p.name} className="min-w-0 truncate font-medium text-foreground">{p.name}</span>
                                    <span className="shrink-0 text-right tabular-nums text-foreground-muted">
                                        {tn("dashboard.masVendidos.unidades", p.units)} · {formatearImporte(p.revenue)}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            {/* AUD-008, paso 4 — aquí iba «Stock y valor por categoría»: es análisis, no lo
                pendiente de hoy, e Informes ya da las dos medidas por separado y bien. */}
        </>
    );
}
