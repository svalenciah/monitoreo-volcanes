async function cargarJSON(ruta) {
    const respuesta = await fetch(ruta, { cache: "no-store" });

    if (!respuesta.ok) {
        throw new Error(
            `No se pudo cargar ${ruta}. HTTP ${respuesta.status}`
        );
    }

    return await respuesta.json();
}

export function cargarCatalogo() {
    return cargarJSON("./data/catalog.json");
}

export function cargarVolcanesGeoJSON() {
    return cargarJSON("./data/volcanes.geojson");
}

export function cargarMunicipiosAntioquia() {
    return cargarJSON("./data/municipios_antioquia.geojson");
}

export function cargarEstacionesSismicas() {
    return cargarJSON("./data/estaciones_sismicas.geojson");
}

export function buscarVolcan(catalogo, volcanId) {
    return (
        catalogo.volcanes.find(
            volcan => volcan.id === volcanId
        ) || null
    );
}

export function obtenerFechas(volcan) {
    return [...(volcan.fechas || [])].sort(
        (a, b) => b.fecha.localeCompare(a.fecha)
    );
}

export function buscarObservacion(volcan, fecha) {
    return (
        (volcan.fechas || []).find(
            observacion => observacion.fecha === fecha
        ) || null
    );
}

export function cargarMetadata(ruta) {
    if (!ruta) {
        return Promise.resolve({});
    }

    return cargarJSON(ruta);
}

export function cargarArea(volcan) {
    if (!volcan.area) {
        return Promise.resolve(null);
    }

    return cargarJSON(volcan.area);
}

export function cargarFlujos(volcan) {
    if (!volcan.flujos) {
        return Promise.resolve(null);
    }

    return cargarJSON(volcan.flujos);
}

export function cargarEstadisticas(ruta) {
    return cargarJSON(ruta);
}

export function cargarSerieTemporal(ruta) {
    if (!ruta) {
        return Promise.resolve(null);
    }

    return cargarJSON(ruta);
}

export function contarVolcanesInSAR(catalogo) {
    return (catalogo.volcanes || []).filter(
        volcan =>
            Array.isArray(volcan.fechas) &&
            volcan.fechas.length > 0
    ).length;
}

export function contarVolcanesSismica(estaciones) {
    const ids = new Set();

    for (const feature of estaciones?.features || []) {
        const volcanId = feature.properties?.volcan_id;

        if (volcanId) {
            ids.add(volcanId);
        }
    }

    return ids.size;
}
