const calendario = document.getElementById("calendario");
const hoy = new Date();
const GIST_ID = "fa3efaace0af92b48d0d3b3755c5fad6"; 
const API_URL = `https://api.github.com/gists/${GIST_ID}`;
import { TOKEN } from "./config.js"; 
let diaSeleccionado = null;

function obtenerNombreUsuario() {
    const nombre = document.getElementById("miembro").value;
    if (!nombre) {
        alert("Por favor, selecciona tu nombre.");
        return null;
    }
    return nombre;
}

async function cargarDisponibilidad() {
    const respuesta = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "GET",
        headers: {
            "X-Master-Key": API_KEY
        }
    });

    const datos = await respuesta.json();
    return datos.record;
}

async function guardarDisponibilidad() {
    const nombre = obtenerNombreUsuario();
    if (!nombre) {
        return;
    }

    const disponibilidad = {};
    document.querySelectorAll(".dia").forEach(dia => {
        const fecha = dia.dataset.fecha;
        const horasSeleccionadas = Array.from(dia.querySelectorAll(".seleccionado"))
            .map(bloque => bloque.dataset.hora)
            .filter(hora => hora);

        if (horasSeleccionadas.length > 0) {
            disponibilidad[fecha] = horasSeleccionadas;
        }
    });

    const datos = await cargarDisponibilidad();
    datos.disponibilidad[nombre] = disponibilidad;

    const respuesta = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": API_KEY
        },
        body: JSON.stringify(datos)
    });

    if (respuesta.ok) {
        alert(`¡Disponibilidad guardada para ${nombre}!`);
        calcularTop3Semanal(); // Actualizar el top 3 al guardar
    } else {
        alert("Hubo un error al guardar la disponibilidad.");
    }
}

async function mostrarDisponibilidad() {
    const nombre = obtenerNombreUsuario();
    if (!nombre) return;

    const datos = await cargarDisponibilidad();
    const disponibilidad = datos.disponibilidad[nombre];
    
    if (disponibilidad) {
        for (const fecha in disponibilidad) {
            const horas = disponibilidad[fecha];
            const dia = document.querySelector(`.dia[data-fecha="${fecha}"]`);
            if (dia) {
                horas.forEach(hora => {
                    const bloque = dia.querySelector(`.hora-bloque[data-hora="${hora}"]`);
                    if (bloque) bloque.classList.add("seleccionado");
                });
            }
        }
    }
}

async function limpiarDatosObsoletos() {
    const hoy = new Date().toISOString().split('T')[0];  // Fecha de hoy en formato YYYY-MM-DD
    const datos = await cargarDisponibilidad();
    let datosActualizados = false;

    // Recorremos la disponibilidad de cada miembro
    for (const miembro in datos.disponibilidad) {
        const disponibilidad = datos.disponibilidad[miembro];

        // Filtramos las fechas que aún no han pasado
        for (const fecha in disponibilidad) {
            if (fecha < hoy) {
                delete disponibilidad[fecha];  // Eliminamos la fecha obsoleta
                datosActualizados = true;
            }
        }
    }

    // Guardamos los datos actualizados solo si hubo cambios
    if (datosActualizados) {
        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": API_KEY
            },
            body: JSON.stringify(datos)
        });
    }
}

// Generar el calendario para 4 semanas
for (let i = 0; i < 28; i++) {
    const fecha = new Date();
    fecha.setDate(hoy.getDate() + i);

    const dia = document.createElement("div");
    dia.classList.add("dia");
    dia.dataset.fecha = fecha.toISOString().split('T')[0];

    dia.innerHTML = `<div class="fecha">${fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</div>`;

    dia.addEventListener("click", function () {
        if (diaSeleccionado !== dia) {
            if (diaSeleccionado) {
                document.getElementById("horas-container").innerHTML = "";
            }
            diaSeleccionado = dia;
            diaSeleccionado.classList.add("seleccionado");
            generarSelectorHoras(dia);
        } else {
            diaSeleccionado.classList.remove("seleccionado");
            diaSeleccionado.querySelectorAll(".hora-bloque.seleccionado, [class^='hora-']").forEach(bloque => bloque.remove());
            diaSeleccionado = null;
            document.getElementById("horas-container").innerHTML = "";
        }
    });

    calendario.appendChild(dia);
}

function generarSelectorHoras(dia) {
    const horasContainer = document.getElementById("horas-container");
    horasContainer.innerHTML = "";

    for (let hora = 10; hora <= 22; hora++) {
        const bloque = document.createElement("div");
        bloque.classList.add("hora-bloque");
        bloque.dataset.hora = hora;
        bloque.textContent = `${hora}:00`;

        if (dia.querySelector(`.hora-${hora}`)) {
            bloque.classList.add("seleccionado");
        }

        bloque.addEventListener("click", function () {
            bloque.classList.toggle("seleccionado");

            if (bloque.classList.contains("seleccionado")) {
                const tempDiv = document.createElement("div");
                tempDiv.classList.add(`hora-${hora}`, "seleccionado");
                tempDiv.dataset.hora = hora;
                dia.appendChild(tempDiv);
            } else {
                const tempDiv = dia.querySelector(`.hora-${hora}`);
                if (tempDiv) tempDiv.remove();
            }
        });

        horasContainer.appendChild(bloque);
    }
}

// =============================
// 📊 CALCULAR TOP 3 POR SEMANA
// =============================
async function calcularTop3Semanal() {
    const datos = await cargarDisponibilidad();
    const disponibilidad = datos.disponibilidad;

    const conteoSemanas = [ {}, {}, {}, {} ]; // 4 semanas

    for (const miembro in disponibilidad) {
        for (const fecha in disponibilidad[miembro]) {
            const date = new Date(fecha);
            const semana = Math.floor((date - hoy) / (7 * 24 * 60 * 60 * 1000)); // Determina la semana (0-3)

            if (semana >= 0 && semana < 4) {
                disponibilidad[miembro][fecha].forEach(hora => {
                    const clave = `${fecha} - ${hora}:00`;
                    conteoSemanas[semana][clave] = (conteoSemanas[semana][clave] || 0) + 1;
                });
            }
        }
    }

    // Mostrar el top 3 de cada semana
    conteoSemanas.forEach((conteo, index) => {
        const top3 = Object.entries(conteo)
            .sort((a, b) => b[1] - a[1])  // Ordenar de mayor a menor
            .slice(0, 3)                 // Top 3
            .map(item => `${item[0]} (${item[1]} personas)`);

        document.getElementById(`ganador-semana-${index + 1}`).innerHTML = top3.join("<br>");
    });
}

// =============================
// 📥 EVENTOS
// =============================
document.getElementById("guardar-btn").addEventListener("click", guardarDisponibilidad);
document.getElementById("miembro").addEventListener("change", mostrarDisponibilidad);

// 🚀 Al cargar la página, calcular el top 3
window.addEventListener("load", calcularTop3Semanal);

document.addEventListener("DOMContentLoaded", limpiarDatosObsoletos);  // Limpieza al cargar la página
document.getElementById("guardar-btn").addEventListener("click", async () => {
    await guardarDisponibilidad();
    await limpiarDatosObsoletos();  // Limpieza después de guardar
});
