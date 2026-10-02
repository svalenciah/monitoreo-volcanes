import {
    cargarCatalogo,
    cargarVolcanesGeoJSON,
    cargarMunicipiosAntioquia,
    cargarEstacionesSismicas,
    buscarVolcan,
    obtenerFechas,
    buscarObservacion,
    cargarMetadata,
    cargarArea,
    cargarFlujos,
    cargarEstadisticas,
    cargarSerieTemporal as cargarSerieTemporalJSON,
    contarVolcanesInSAR,
    contarVolcanesSismica
} from "./data.js?v=20261002-limites-municipales";

import {
    crearMapaGeneral,
    crearMapaBoletin
} from "./map.js?v=20261002-limites-municipales";

import {
    crearGraficaEvolucion
} from "./charts.js?v=20261001-eje-y";


const homeView = document.getElementById("home-view");
const bulletinView = document.getElementById("bulletin-view");
const dateSelect = document.getElementById("date-select");
const backButton = document.getElementById("back-button");


// ============================================================
// INICIO
// ============================================================

async function iniciar() {
    try {
        const parametros = new URLSearchParams(
            window.location.search
        );

        const volcanId = parametros.get("volcan");
        const fechaUrl = parametros.get("fecha");

        const catalogo = await cargarCatalogo();
        actualizarEnlacesVolcanes(catalogo);

        if (!volcanId) {
            await mostrarMapaGeneral(catalogo);
            return;
        }

        await mostrarBoletin(
            catalogo,
            volcanId,
            fechaUrl
        );
    } catch (error) {
        console.error(
            "Error iniciando el geoportal:",
            error
        );
    }
}


function actualizarEnlacesVolcanes(catalogo) {
    const contenedor = document.getElementById("site-links");

    if (!contenedor) {
        return;
    }

    const volcanes = [...(catalogo.volcanes || [])].sort(
        (a, b) => a.nombre.localeCompare(b.nombre, "es")
    );

    for (const volcan of volcanes) {
        const enlace = document.createElement("a");
        enlace.href = `?volcan=${encodeURIComponent(volcan.id)}`;
        enlace.textContent = volcan.nombre;
        contenedor.appendChild(enlace);
    }
}


// ============================================================
// MAPA GENERAL
// ============================================================

async function mostrarMapaGeneral(catalogo) {
    homeView.hidden = false;
    bulletinView.hidden = true;

    const volcanes = await cargarVolcanesGeoJSON();
    let municipiosAntioquia = null;

    try {
        municipiosAntioquia = await cargarMunicipiosAntioquia();
    } catch (error) {
        console.warn(
            "No fue posible cargar los límites municipales de Antioquia:",
            error
        );
    }

    const volcanesInSAR = new Set(
        (catalogo.volcanes || []).map(volcan => volcan.id)
    );

    volcanes.features = (volcanes.features || []).map(feature => ({
        ...feature,
        properties: {
            ...feature.properties,
            tiene_insar: volcanesInSAR.has(feature.properties?.id)
        }
    }));

    let estaciones = {
        type: "FeatureCollection",
        features: []
    };

    try {
        estaciones = await cargarEstacionesSismicas();
    } catch (error) {
        console.warn(
            "No fue posible cargar las estaciones sísmicas:",
            error
        );
    }

    colocarTexto(
        "stat-volcanic-buildings",
        volcanes.features?.length || 0
    );

    colocarTexto(
        "stat-insar",
        contarVolcanesInSAR(catalogo)
    );

    colocarTexto(
        "stat-seismic",
        contarVolcanesSismica(estaciones)
    );

    crearMapaGeneral(
        volcanes,
        volcanId => {
            if (!buscarVolcan(catalogo, volcanId)) {
                return;
            }

            const url = new URL(
                window.location.href
            );

            url.search = "";
            url.searchParams.set(
                "volcan",
                volcanId
            );

            window.location.href = url.toString();
        },
        municipiosAntioquia
    );
}


// ============================================================
// BOLETIN
// ============================================================

async function mostrarBoletin(
    catalogo,
    volcanId,
    fechaUrl
) {
    const volcan = buscarVolcan(
        catalogo,
        volcanId
    );

    if (!volcan) {
        throw new Error(
            `No se encontró el volcán '${volcanId}' en catalog.json.`
        );
    }

    homeView.hidden = true;
    bulletinView.hidden = false;

    colocarTexto(
        "volcano-name",
        volcan.nombre
    );

    // --------------------------------------------------------
    // Metadatos
    // --------------------------------------------------------

    const metadata = await cargarMetadata(
        volcan.metadata
    );

    colocarTexto(
        "technical-sensor",
        metadata.sensor || "--"
    );

    colocarTexto(
        "technical-method",
        metadata.metodo || "--"
    );

    colocarTexto(
        "technical-processing",
        metadata.procesamiento || "--"
    );

    colocarTexto(
        "technical-geometry",
        metadata.geometria || "--"
    );

    colocarTexto(
        "technical-note",
        metadata.nota ||
        "La información presentada tiene carácter informativo y corresponde a observaciones satelitales de cambios en la superficie."
    );

    // --------------------------------------------------------
    // Área y flujos: son opcionales para que un archivo faltante
    // no impida cargar el raster.
    // --------------------------------------------------------

    let area = null;
    let flujos = null;

    try {
        area = await cargarArea(volcan);
    } catch (error) {
        console.warn(
            "No fue posible cargar el área de estudio:",
            error
        );
    }

    try {
        flujos = await cargarFlujos(volcan);
    } catch (error) {
        console.warn(
            "No fue posible cargar los flujos históricos:",
            error
        );
    }

    let estacionesVolcan = {
        type: "FeatureCollection",
        features: []
    };

    try {
        const estaciones = await cargarEstacionesSismicas();
        estacionesVolcan.features = (estaciones.features || []).filter(
            feature => feature.properties?.volcan_id === volcan.id
        );
    } catch (error) {
        console.warn(
            "No fue posible cargar las estaciones sísmicas del volcán:",
            error
        );
    }

    // --------------------------------------------------------
    // Fechas disponibles
    // --------------------------------------------------------

    const observaciones = obtenerFechas(volcan);

    if (observaciones.length === 0) {
        throw new Error(
            `El volcán '${volcan.nombre}' no tiene observaciones registradas.`
        );
    }

    dateSelect.innerHTML = "";

    for (const observacion of observaciones) {
        const opcion = document.createElement("option");

        opcion.value = observacion.fecha;
        opcion.textContent = formatearFecha(
            observacion.fecha
        );

        dateSelect.appendChild(opcion);
    }

    const fechaInicial =
        fechaUrl &&
        buscarObservacion(volcan, fechaUrl)
            ? fechaUrl
            : observaciones[0].fecha;

    dateSelect.value = fechaInicial;

    const observacionInicial = buscarObservacion(
        volcan,
        fechaInicial
    );

    await cargarObservacion(
        observacionInicial,
        area,
        flujos,
        estacionesVolcan
    );

    // --------------------------------------------------------
    // Serie temporal completa del volcán
    // --------------------------------------------------------

    await mostrarSerieTemporal(
        volcan
    );

    // --------------------------------------------------------
    // Eventos
    // --------------------------------------------------------

    dateSelect.onchange = async () => {
        const fecha = dateSelect.value;

        const observacion = buscarObservacion(
            volcan,
            fecha
        );

        if (!observacion) {
            return;
        }

        const url = new URL(
            window.location.href
        );

        url.searchParams.set(
            "volcan",
            volcan.id
        );

        url.searchParams.set(
            "fecha",
            fecha
        );

        window.history.replaceState(
            {},
            "",
            url
        );

        await cargarObservacion(
            observacion,
            area,
            flujos,
            estacionesVolcan
        );
    };

    backButton.onclick = () => {
        window.location.href = window.location.pathname;
    };
}


// ============================================================
// OBSERVACION INDIVIDUAL
// ============================================================

async function cargarObservacion(
    observacion,
    area,
    flujos,
    estacionesGeoJSON
) {
    if (!observacion) {
        return;
    }

    const estadisticas = await cargarEstadisticas(
        observacion.estadisticas
    );

    colocarTexto(
        "stat-min",
        formatoCm(
            estadisticas.minimo_cm
        )
    );

    colocarTexto(
        "stat-max",
        formatoCm(
            estadisticas.maximo_cm
        )
    );

    colocarTexto(
        "stat-mean",
        formatoCm(
            estadisticas.promedio_cm
        )
    );

    const fechaDato =
        estadisticas.fecha ||
        observacion.fecha;

    colocarTexto(
        "stat-date",
        formatearFecha(
            String(fechaDato)
        )
    );

    colocarTexto(
        "observation-description",
        generarDescripcionObservacion(
            estadisticas,
            String(fechaDato)
        )
    );

    await crearMapaBoletin(
        observacion,
        area,
        flujos,
        estacionesGeoJSON
    );
}


// ============================================================
// SERIE TEMPORAL
// ============================================================

async function mostrarSerieTemporal(volcan) {
    const mensaje = document.getElementById(
        "time-series-message"
    );

    const contenedorGrafica = document.querySelector(
        ".time-series-chart"
    );

    if (!volcan.serie) {
        mostrarMensajeSerie(
            mensaje,
            contenedorGrafica,
            "Serie temporal no disponible para este volcán."
        );
        return;
    }

    try {
        const datos = await cargarSerieTemporalJSON(
            volcan.serie
        );

        const serie = Array.isArray(datos)
            ? datos
            : datos?.serie;

        if (
            !Array.isArray(serie) ||
            serie.length === 0
        ) {
            mostrarMensajeSerie(
                mensaje,
                contenedorGrafica,
                "La serie temporal no contiene datos disponibles."
            );
            return;
        }

        if (mensaje) {
            mensaje.hidden = true;
            mensaje.textContent = "";
        }

        if (contenedorGrafica) {
            contenedorGrafica.hidden = false;
        }

        const creada = crearGraficaEvolucion(
            "evolution-chart",
            serie
        );

        if (!creada) {
            mostrarMensajeSerie(
                mensaje,
                contenedorGrafica,
                "No fue posible representar la serie temporal. Revise los datos de fecha y promedio_cm."
            );
        }
    } catch (error) {
        console.error(
            "Error cargando la serie temporal:",
            error
        );

        mostrarMensajeSerie(
            mensaje,
            contenedorGrafica,
            "No fue posible cargar la serie temporal."
        );
    }
}

function mostrarMensajeSerie(
    mensaje,
    contenedorGrafica,
    texto
) {
    if (mensaje) {
        mensaje.textContent = texto;
        mensaje.hidden = false;
    }

    if (contenedorGrafica) {
        contenedorGrafica.hidden = true;
    }
}


// ============================================================
// DESCRIPCION AUTOMATICA
// ============================================================

function generarDescripcionObservacion(
    estadisticas,
    fecha
) {
    const minimo = Number(
        estadisticas.minimo_cm
    );

    const maximo = Number(
        estadisticas.maximo_cm
    );

    const promedio = Number(
        estadisticas.promedio_cm
    );

    if (
        !Number.isFinite(minimo) ||
        !Number.isFinite(maximo) ||
        !Number.isFinite(promedio)
    ) {
        return (
            "No se encuentran disponibles las estadísticas " +
            "de esta observación."
        );
    }

    return (
        `El mapa correspondiente al ${formatearFecha(fecha)} ` +
        `muestra cambios acumulados en la superficie entre ` +
        `${minimo.toFixed(2)} cm y ${maximo.toFixed(2)} cm, ` +
        `con un valor promedio de ${promedio.toFixed(2)} cm. ` +
        `Los valores representan desplazamientos medidos en la ` +
        `línea de vista del sensor (LOS) respecto a la fecha de referencia.`
    );
}


// ============================================================
// UTILIDADES
// ============================================================

function colocarTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        elemento.textContent = "--";
        return;
    }

    elemento.textContent = valor;
}

function formatoCm(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "--";
    }

    return `${numero.toFixed(2)} cm`;
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "--";
    }

    const texto = String(fecha);

    if (texto.length !== 8) {
        return texto;
    }

    const anio = texto.slice(0, 4);
    const mes = texto.slice(4, 6);
    const dia = texto.slice(6, 8);

    return `${dia}/${mes}/${anio}`;
}


const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
menuToggle.addEventListener("click", () => {
    const abierto = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(abierto));
    siteNav.classList.toggle("is-open", abierto);
});

iniciar();
