// =========================
// 📅 CONFIGURACIÓN INICIAL
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import { getDatabase, ref, child, get, update, set } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-database.js";

let members = ["Jose", "Pol", "Sara", "Sergio", "Susana"];
let members_availabilities = {};

const firebaseConfig = {
  apiKey: "AIzaSyDusOS6miNKlSsIqDQdO3wUMMMnd7NhQGQ",
  authDomain: "band-scheduler-3d73e.firebaseapp.com",
  databaseURL: "https://band-scheduler-3d73e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "band-scheduler-3d73e",
  storageBucket: "band-scheduler-3d73e.appspot.com",
  messagingSenderId: "315542799355",
  appId: "1:315542799355:web:0c9dbb857544a88dfb815e",
  measurementId: "G-P1YY4EK871"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const calendario = document.getElementById("calendario");
const hoy = new Date();
let diaSeleccionado = null;

// =========================
// 🔑 FUNCIONES UTILITARIAS
// =========================
function obtenerNombreUsuario() {
    const nombre = document.getElementById("miembro").value;
    if (!nombre) {
        alert("Por favor, selecciona tu nombre.");
        return null;
    }
    return nombre;
}

async function cargarDisponibilidad() {
    const dbRef = ref(db, 'disponibilidad');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        console.log('Disponibilidad encontrada:', snapshot.val());
        return snapshot.val();
    } else {
        console.log('Creando el nodo disponibilidad y miembros...');
        for (const miembro of members) {
            const miembroRef = ref(db, `disponibilidad/${miembro}`);
            await set(miembroRef, {});
        }
        return {};
    }
}

async function actualizarDisponibilidad(datos) {
    const dbRef = ref(db);
    await set(dbRef, datos);
}

// =========================
// 💾 GUARDAR DISPONIBILIDAD
// =========================
async function guardarDisponibilidad() {
    const nombre = obtenerNombreUsuario();
    if (!nombre) return;

    const disponibilidad = {};

    for (const fecha in members_availabilities[nombre]) {
        const horas = members_availabilities[nombre][fecha];
        if (horas.length > 0) {
            disponibilidad[fecha] = horas;
        }
    }

    // 🔧 Actualizamos solo la disponibilidad del miembro actual
    const miembroRef = ref(db, `disponibilidad/${nombre}`);
    await set(miembroRef, disponibilidad);

    alert(`¡Disponibilidad guardada para ${nombre}!`);
    await mostrarCalendario();
    await limpiarDatosObsoletos();
    await calcularTop3Semanal();
}


// =========================
// 📊 MOSTRAR DISPONIBILIDAD
// =========================
async function mostrarDisponibilidad() {
    const nombre = obtenerNombreUsuario();
    if (!nombre) return;

    const datos = await cargarDisponibilidad();
    const disponibilidad = datos.disponibilidad?.[nombre] || {};

    document.querySelectorAll(".hora-bloque").forEach(b => b.classList.remove("seleccionado"));

    if (disponibilidad) {
        for (const fecha in disponibilidad) {
            const horas = disponibilidad[fecha];
            horas.forEach(hora => {
                const bloque = document.querySelector(`.dia[data-fecha="${fecha}"] .hora-bloque[data-hora="${hora}"]`);
                if (bloque) bloque.classList.add("seleccionado");
            });
        }
    }
}

// =========================
// 🧹 LIMPIAR DATOS OBSOLETOS
// =========================
async function limpiarDatosObsoletos() {
    const hoyStr = hoy.toISOString().split('T')[0];
    const datos = await cargarDisponibilidad();
    let datosActualizados = false;

    for (const miembro in datos) {
        for (const fecha in datos[miembro]) {
            if (fecha < hoyStr) {
                delete datos[miembro][fecha];
                datosActualizados = true;
            }
        }
        if(Object.keys(datos[miembro]).length === 0) {
            delete datos[miembro];
            datosActualizados = true;
        }
    }

    if (datosActualizados) {
        await actualizarDisponibilidad(datos);
    }
}

// =========================
// 📅 GENERAR CALENDARIO
// =========================
async function mostrarCalendario() {
    calendario.innerHTML = "";  // Limpiar calendario anterior
    const nombreUsuario = obtenerNombreUsuario();
    if (!nombreUsuario) return;

    const disponibilidadRef = ref(db, `disponibilidad/${nombreUsuario}`);
    const snapshot = await get(disponibilidadRef);
    const disponibilidadUsuario = snapshot.exists() ? snapshot.val() : {};

    for (let i = 0; i < 28; i++) {
        const fecha = new Date();
        fecha.setDate(hoy.getDate() + i);

        const fechaISO = fecha.toISOString().split('T')[0];
        const dia = document.createElement("div");
        dia.classList.add("dia");
        dia.dataset.fecha = fechaISO;

        dia.innerHTML = `<div class="fecha">${fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</div>`;

        // ✅ Resaltar días con disponibilidad guardada
        if (disponibilidadUsuario[fechaISO] && disponibilidadUsuario[fechaISO].length > 0) {
            dia.classList.add("seleccionado");
        } else {
            dia.classList.remove("seleccionado");  // ✅ Asegura que días vacíos no estén resaltados
        }

        dia.addEventListener("click", async function () {
            const nombreUsuario = obtenerNombreUsuario();
            const fecha = dia.dataset.fecha;
        
            if (!nombreUsuario) return;

            if(diaSeleccionado && diaSeleccionado !== dia && diaSeleccionado.classList.contains("marcado")) {
                diaSeleccionado.classList.remove("marcado");
            }

            diaSeleccionado = dia;

            if(diaSeleccionado.classList.contains("marcado")) {
                diaSeleccionado.classList.remove("marcado");
                diaSeleccionado.classList.remove("seleccionado");
                if (members_availabilities[nombreUsuario]) {
                    delete members_availabilities[nombreUsuario][fecha];
                
                    // Si ya no quedan fechas disponibles para el usuario, eliminar la clave entera
                    if (Object.keys(members_availabilities[nombreUsuario]).length === 0) {
                        delete members_availabilities[nombreUsuario];
                    }
                }
                document.querySelectorAll(".hora.seleccionado").forEach((btn) => {
                    btn.classList.remove("seleccionado");
                });
                document.getElementById("horas-container").innerHTML = "";
            }
            else{
                diaSeleccionado.classList.add("seleccionado");
                diaSeleccionado.classList.add("marcado");
                generarSelectorHoras(dia);
            }
        });
        
              

        calendario.appendChild(dia);
    }
}


// =========================
// 🕰️ GENERAR SELECTOR DE HORAS
// =========================
async function generarSelectorHoras(dia) {
    const horasContainer = document.getElementById("horas-container");
    horasContainer.innerHTML = "";

    const nombreUsuario = obtenerNombreUsuario();
    if (!nombreUsuario) return;

    const fechaSeleccionada = dia.dataset.fecha;

    // 📌 Si ya hay datos en memoria local, úsalos en lugar de hacer una nueva consulta
    let horasDisponibles = members_availabilities[nombreUsuario]?.[fechaSeleccionada] || null;

    if (horasDisponibles === null) {
        // 🔄 Si no hay datos locales, obtener de Firebase
        const miembroRef = ref(db, `disponibilidad/${nombreUsuario}/${fechaSeleccionada}`);
        const snapshot = await get(miembroRef);
        horasDisponibles = snapshot.exists() ? snapshot.val() : [];
        
        // Guardamos en memoria local para evitar recargas innecesarias
        if (!members_availabilities[nombreUsuario]) {
            members_availabilities[nombreUsuario] = {};
        }
        members_availabilities[nombreUsuario][fechaSeleccionada] = horasDisponibles;
    }

    // 📅 Generar los bloques de horas
    for (let hora = 10; hora <= 22; hora++) {
        const bloque = document.createElement("div");
        bloque.classList.add("hora-bloque");
        bloque.dataset.hora = hora;
        bloque.textContent = `${hora}:00`;

        // ✅ Respetar selección previa en memoria local
        if (horasDisponibles.includes(hora)) {
            bloque.classList.add("seleccionado");
        }

        bloque.addEventListener("click", () => {
            bloque.classList.toggle("seleccionado");

            if (bloque.classList.contains("seleccionado")) {
                if (!members_availabilities[nombreUsuario][fechaSeleccionada]) {
                    members_availabilities[nombreUsuario][fechaSeleccionada] = [];
                }
                // Evitar duplicados
                if (!members_availabilities[nombreUsuario][fechaSeleccionada].includes(hora)) {
                    members_availabilities[nombreUsuario][fechaSeleccionada].push(hora);
                }
            } else {
                members_availabilities[nombreUsuario][fechaSeleccionada] =
                    members_availabilities[nombreUsuario][fechaSeleccionada].filter(h => h !== hora);
            }
        });

        horasContainer.appendChild(bloque);
    }
}



// =========================
// 🏆 CALCULAR TOP 3 SEMANAL CON DISEÑO MEJORADO
// =========================
async function calcularTop3Semanal() {
    try {
        const snapshot = await get(ref(db, 'disponibilidad'));
        const disponibilidad = snapshot.val() || {};

        const conteoSemanas = [{}, {}, {}, {}];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizar fecha actual

        for (const miembro in disponibilidad) {
            for (const fecha in disponibilidad[miembro]) {
                const date = new Date(fecha);
                date.setHours(0, 0, 0, 0);

                const diffDias = Math.floor((date - hoy) / (24 * 60 * 60 * 1000));
                const semana = Math.floor(diffDias / 7);

                if (semana >= 0 && semana < 4) {
                    disponibilidad[miembro][fecha].forEach(hora => {
                        const clave = `${fecha} - ${hora}:00`;
                        conteoSemanas[semana][clave] = (conteoSemanas[semana][clave] || 0) + 1;
                    });
                }
            }
        }

        conteoSemanas.forEach((conteo, index) => {
            const top3 = Object.entries(conteo)
                .sort((a, b) => b[1] - a[1]) 
                .slice(0, 3); 

            const ganadorSemana = document.getElementById(`ganador-semana-${index + 1}`);
            if (ganadorSemana) {
                ganadorSemana.innerHTML = ""; // Limpiar antes de añadir

                if (top3.length === 0) {
                    ganadorSemana.innerHTML = "<p>Sin disponibilidad registrada</p>";
                } else {
                    top3.forEach((item, position) => {
                        const tarjeta = document.createElement("div");
                        tarjeta.classList.add("tarjeta-top3", `posicion-${position + 1}`);

                        tarjeta.innerHTML = `
                            <div class="hora-top3">${item[0]}</div>
                            <div class="votos-top3">👥 ${item[1]} personas disponibles</div>
                        `;
                        ganadorSemana.appendChild(tarjeta);
                    });
                }
            }
        });

    } catch (error) {
        console.error("Error al cargar datos de Firebase:", error);
    }
}



// =========================
// 📥 EVENTOS
// =========================
document.getElementById("guardar-btn").addEventListener("click", guardarDisponibilidad);
document.getElementById("miembro").addEventListener("change", mostrarDisponibilidad);
document.getElementById("miembro").addEventListener("change", mostrarCalendario);

window.addEventListener("load", async () => {
    for (const miembro of members) {
        members_availabilities[miembro] = {};
    }
    await limpiarDatosObsoletos();
    await calcularTop3Semanal();
});
