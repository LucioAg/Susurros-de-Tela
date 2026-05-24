// --- CONFIGURACIÓN ---
const HOJA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT113teW7diuTt-73DS0d4FLPkBI1bPMBDuzSPLT1-dBmbiM-jVIqG3NXc_CEoh0CHoXQ7jcQel7cXt/pub?output=csv";
const NUMERO_WA = "5492604501034"; 

// --- ESTADO GLOBAL ---
let productos = [];
let carrito = []; 
let categoriaActual = 'TODAS'; 
let busquedaActual = ''; 
let promocionesActivas = [];
let textoChamuyo = ""; // Variable para guardar la identidad de la marca

// --- CARGA DE DATOS ---
async function cargarProductos() {
    try {
        const respuesta = await fetch(HOJA_CSV_URL);
        const textoCsv = await respuesta.text();
        const filas = textoCsv.split('\n');

        for (let i = 1; i < filas.length; i++) {
            if (!filas[i].trim()) continue;
            const columnas = filas[i].split(',');
            
            // --- Carga de imágenes ---
            let linkImagen = columnas[4] ? columnas[4].trim() : ""; 
            if (linkImagen.includes('drive.google.com/file/d/')) {
                let idFoto = linkImagen.split('/d/')[1].split('/')[0];
                linkImagen = `https://drive.google.com/thumbnail?id=${idFoto}`;
            }

            // --- Lectura de Promociones (Columna H -> Índice 7) ---
            let promoCelda = columnas[7] ? columnas[7].trim().replace(/^"|"$/g, '') : "";
            if (promoCelda && promoCelda.toLowerCase() !== "promociones") {
                promocionesActivas.push(promoCelda);
            }

            // --- Lectura de Identidad/Chamuyo (Columna I -> Índice 8) ---
            // Solo guarda el primer texto válido que encuentre
            if (columnas.length > 8 && textoChamuyo === "") {
                let chamuyoCelda = columnas[8].trim().replace(/^"|"$/g, '');
                if (chamuyoCelda && chamuyoCelda.toLowerCase() !== "chamuyo") {
                    textoChamuyo = chamuyoCelda;
                }
            }

            // --- Creación de producto ---
            const producto = {
                id: columnas[0].trim(),
                nombre: columnas[1].trim(),
                categoria_id: columnas[2].trim().toUpperCase(), 
                categoria_nombre: columnas[2].trim().charAt(0).toUpperCase() + columnas[2].trim().slice(1).toLowerCase(),
                precio: parseFloat(columnas[3].trim()),
                imagenBase: linkImagen, 
                imagenTarjeta: linkImagen + "&sz=w800", 
                imagenZoom: linkImagen + "&sz=w1600", 
                stock: columnas[5].trim().toUpperCase()
            };

            if (producto.stock === "SI" || producto.stock === "SÍ") {
                productos.push(producto);
            }
        }
        
        document.getElementById('loader').classList.add('hidden');
        
        iniciarRotacionPromos();
        mostrarIdentidadChamuyo(); // Llamamos a la función que muestra el texto
        dibujarFiltros();
        dibujarTarjetas();

    } catch (error) {
        console.error("Error:", error);
        document.getElementById('loader').innerText = "Lo sentimos, hubo un inconveniente al cargar el catálogo. Por favor, intente recargar la página.";
    }
}

// --- MOSTRAR IDENTIDAD (CHAMUYO) ---
function mostrarIdentidadChamuyo() {
    const seccionIdentidad = document.getElementById('seccion-identidad');
    const contenidoIdentidad = document.getElementById('texto-identidad-contenido');
    const textoContenedor = document.getElementById('texto-identidad');
    const btnToggle = document.getElementById('btn-toggle-identidad');
    const fadeContenedor = document.getElementById('fade-identidad');

    // Si hay un texto en la columna I, lo mostramos
    if (textoChamuyo) {
        contenidoIdentidad.innerText = textoChamuyo;
        seccionIdentidad.classList.remove('hidden');

        // Un pequeño retraso para que el navegador calcule bien la altura del texto
        setTimeout(() => {
            // Si el texto es muy cortito (menos de 85px), ocultamos el botón de "Leer más" y el difuminado
            if (textoContenedor.scrollHeight <= 85) {
                btnToggle.classList.add('hidden');
                fadeContenedor.classList.add('hidden');
                textoContenedor.style.maxHeight = "none";
            }
        }, 100);
    }
}

// Lógica de Expandir/Comprimir para el texto de identidad
const btnToggleIdentidad = document.getElementById('btn-toggle-identidad');
let identidadExpandida = false;

if (btnToggleIdentidad) {
    btnToggleIdentidad.addEventListener('click', () => {
        const textoContenedor = document.getElementById('texto-identidad');
        const fadeContenedor = document.getElementById('fade-identidad');
        const iconoToggle = document.getElementById('icono-toggle-identidad');
        const spanToggle = document.getElementById('span-toggle-identidad');

        identidadExpandida = !identidadExpandida;
        
        if (identidadExpandida) {
            textoContenedor.style.maxHeight = textoContenedor.scrollHeight + "px";
            fadeContenedor.classList.add('opacity-0');
            iconoToggle.classList.add('rotate-180');
            spanToggle.innerText = "Ocultar";
        } else {
            textoContenedor.style.maxHeight = "80px";
            fadeContenedor.classList.remove('opacity-0');
            iconoToggle.classList.remove('rotate-180');
            spanToggle.innerText = "Leer más";
        }
    });
}

// --- ROTACIÓN DE PROMOCIONES ---
function iniciarRotacionPromos() {
    const promosUnicas = [...new Set(promocionesActivas)];
    const contenedor = document.getElementById('contenedor-promos');
    const textoEl = document.getElementById('texto-promo');

    if (promosUnicas.length === 0) {
        contenedor.classList.add('hidden');
        return;
    }

    contenedor.classList.remove('hidden');
    textoEl.innerText = promosUnicas[0];

    if (promosUnicas.length > 1) {
        let indicePromo = 0;
        setInterval(() => {
            textoEl.style.opacity = 0;
            setTimeout(() => {
                indicePromo = (indicePromo + 1) % promosUnicas.length;
                textoEl.innerText = promosUnicas[indicePromo];
                textoEl.style.opacity = 1;
            }, 300);
        }, 10000); 
    }
}

// --- SISTEMA DE FILTROS ---
function dibujarFiltros() {
    const contenedor = document.getElementById('contenedor-filtros');
    contenedor.innerHTML = '';

    const categoriasMapa = new Map();
    productos.forEach(p => {
        if (!categoriasMapa.has(p.categoria_id)) {
            categoriasMapa.set(p.categoria_id, p.categoria_nombre);
        }
    });

    const categoriasUnicas = ['TODAS', ...Array.from(categoriasMapa.keys())];

    categoriasUnicas.forEach(catId => {
        const isActive = categoriaActual === catId;
        
        const clasesBoton = isActive 
            ? "bg-dorado text-white border-dorado shadow-md font-medium" 
            : "bg-white text-nude-900 border-nude-100 hover:border-dorado hover:text-dorado hover:bg-nude-50 font-light";

        const textoMostrar = catId === 'TODAS' ? 'Ver Todo' : categoriasMapa.get(catId);

        contenedor.innerHTML += `
            <button onclick="filtrarCategoria('${catId}')" 
                    class="whitespace-nowrap px-4 py-1.5 md:px-6 md:py-2 rounded-full border-2 shadow-sm text-xs md:text-base transition-all duration-300 ${clasesBoton}">
                ${textoMostrar}
            </button>
        `;
    });
}

function filtrarCategoria(catSeleccionada) {
    categoriaActual = catSeleccionada;
    dibujarFiltros(); 
    dibujarTarjetas(); 
}

// --- EVENTO DEL BUSCADOR ---
document.getElementById('input-buscador').addEventListener('input', (e) => {
    busquedaActual = e.target.value.toLowerCase().trim();
    dibujarTarjetas(); 
});

// --- RENDERIZADO DE TARJETAS ---
function obtenerBotonTarjetaHtml(idProducto) {
    let item = carrito.find(i => i.id === idProducto);
    const hClase = "h-[36px] md:h-[50px]";

    if (!item) {
        return `<button onclick="agregarAlCarrito('${idProducto}')" class="w-full ${hClase} bg-dorado hover:bg-dorado-hover text-white font-medium py-1.5 md:py-2 px-4 rounded-lg md:rounded-xl transition-all duration-300 text-sm md:text-lg shadow-sm">
                    Sumar al pedido
                </button>`;
    } else {
        return `
        <div class="flex items-center justify-between bg-nude-100 rounded-lg md:rounded-xl p-1 border border-nude-200 ${hClase}">
            <button onclick="cambiarCantidad('${idProducto}', -1)" class="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white text-nude-900 rounded md:rounded-lg shadow hover:bg-dorado hover:text-white font-bold text-lg md:text-xl transition-all">-</button>
            <span class="text-sm md:text-xl font-semibold w-6 md:w-8 text-center text-nude-900">${item.cantidad}</span>
            <button onclick="cambiarCantidad('${idProducto}', 1)" class="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white text-nude-900 rounded md:rounded-lg shadow hover:bg-dorado hover:text-white font-bold text-lg md:text-xl transition-all">+</button>
        </div>`;
    }
}

function dibujarTarjetas() {
    const contenedor = document.getElementById('grilla-productos');
    contenedor.innerHTML = '';

    const productosParaMostrar = productos.filter(p => {
        const coincideCategoria = categoriaActual === 'TODAS' || p.categoria_id === categoriaActual;
        const nombreBuscado = p.nombre.toLowerCase();
        const catBuscada = p.categoria_nombre.toLowerCase();
        const coincideBusqueda = nombreBuscado.includes(busquedaActual) || catBuscada.includes(busquedaActual);
        return coincideCategoria && coincideBusqueda;
    });

    if (productosParaMostrar.length === 0) {
        contenedor.innerHTML = `<div class="col-span-full text-center text-nude-800 py-8 md:py-12 bg-white rounded-xl md:rounded-2xl shadow-sm border border-nude-100 p-6 md:p-8">
            <p class="text-sm md:text-xl font-light">No encontramos artículos que coincidan con "<span class="font-medium text-nude-900">${busquedaActual}</span>".</p>
            <button onclick="document.getElementById('input-buscador').value=''; busquedaActual=''; dibujarTarjetas();" class="mt-4 text-dorado font-medium underline text-xs md:text-base hover:text-dorado-hover">Ver todos los productos disponibles</button>
        </div>`;
        return;
    }

    productosParaMostrar.forEach(prod => {
        const precioArs = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(prod.precio);

        const htmlTarjeta = `
            <div class="bg-white rounded-xl md:rounded-2xl shadow-sm md:shadow-premium border border-nude-100 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col">
                <div class="overflow-hidden h-40 md:h-64 lg:h-80 relative cursor-zoom-in" onclick='abrirModalImagen("${prod.imagenZoom}", ${JSON.stringify(prod.nombre)})'>
                    <img src="${prod.imagenTarjeta}" alt="${prod.nombre}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" onerror="this.src='https://placehold.co/800x600/e1cfc2/e1cfc2/png'">
                </div>
                <div class="p-3 md:p-6 flex flex-col flex-1 space-y-1 md:space-y-3">
                    <span class="text-[10px] md:text-sm font-medium uppercase text-dorado tracking-widest leading-none">${prod.categoria_nombre}</span>
                    <h3 class="text-sm md:text-xl font-serif text-nude-900 line-clamp-2 leading-tight md:leading-snug font-medium">${prod.nombre}</h3>
                    <p class="text-lg md:text-3xl font-semibold text-nude-900 mt-auto pt-1 md:pt-2 leading-none">${precioArs}</p>
                    
                    <div id="accion-tarjeta-${prod.id}" class="mt-2 md:mt-5 w-full">
                        ${obtenerBotonTarjetaHtml(prod.id)}
                    </div>
                </div>
            </div>
        `;
        contenedor.innerHTML += htmlTarjeta;
    });
}

// --- LÓGICA DEL CARRITO ---
function agregarAlCarrito(idSeleccionado) {
    let itemEnCarrito = carrito.find(item => item.id === idSeleccionado);
    if (itemEnCarrito) { itemEnCarrito.cantidad++; } 
    else {
        const prod = productos.find(p => p.id === idSeleccionado);
        if (prod) { carrito.push({ ...prod, cantidad: 1 }); }
    }
    actualizarUI();
}

function cambiarCantidad(id, cambio) {
    let item = carrito.find(i => i.id === id);
    if (item) {
        item.cantidad += cambio;
        if (item.cantidad <= 0) { carrito = carrito.filter(i => i.id !== id); }
        actualizarUI();
    }
}

function actualizarUI() {
    let cantidadTotal = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    document.getElementById('contador-carrito').innerText = cantidadTotal;

    const contenedorItems = document.getElementById('items-carrito');
    let totalApagar = 0;

    if (carrito.length === 0) {
        contenedorItems.innerHTML = '<p class="text-center text-nude-800 mt-10 md:mt-16 text-sm md:text-base font-light">Tu pedido está esperando que elijas algo hermoso.</p>';
    } else {
        contenedorItems.innerHTML = '';
        carrito.forEach(item => {
            const subtotal = item.precio * item.cantidad;
            totalApagar += subtotal;
            const format = (num) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);

            contenedorItems.innerHTML += `
                <div class="flex items-center gap-3 md:gap-4 bg-nude-50 p-2 md:p-4 rounded-lg md:rounded-xl border border-nude-100 shadow-sm">
                    <img src="${item.imagenTarjeta}" class="w-12 h-12 md:w-16 md:h-16 object-cover rounded md:rounded-lg border border-white shadow-sm cursor-zoom-in" onclick='abrirModalImagen("${item.imagenZoom}", ${JSON.stringify(item.nombre)})' onerror="this.src='https://placehold.co/200/e1cfc2/e1cfc2/png'">
                    <div class="flex-1">
                        <h4 class="text-xs md:text-base font-medium text-nude-900 line-clamp-2 leading-tight">${item.nombre}</h4>
                        <p class="text-dorado font-bold text-sm md:text-base mt-0.5 md:mt-1">${format(subtotal)}</p>
                    </div>
                    <div class="flex items-center gap-1 md:gap-2 bg-white rounded md:rounded-lg p-1 border border-nude-100">
                        <button onclick="cambiarCantidad('${item.id}', -1)" class="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-nude-100 text-nude-900 rounded hover:bg-dorado hover:text-white font-bold text-base md:text-lg">-</button>
                        <span class="text-sm md:text-lg font-semibold w-4 md:w-5 text-center text-nude-900">${item.cantidad}</span>
                        <button onclick="cambiarCantidad('${item.id}', 1)" class="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-nude-100 text-nude-900 rounded hover:bg-dorado hover:text-white font-bold text-base md:text-lg">+</button>
                    </div>
                </div>
            `;
        });
    }

    const formatTotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalApagar);
    document.getElementById('total-carrito').innerText = formatTotal;

    productos.forEach(prod => {
        const contenedorBoton = document.getElementById(`accion-tarjeta-${prod.id}`);
        if (contenedorBoton) {
            contenedorBoton.innerHTML = obtenerBotonTarjetaHtml(prod.id);
        }
    });
}

// --- EVENTOS DE MODALES ---
const modalCarrito = document.getElementById('modal-carrito');
const modalImagen = document.getElementById('modal-imagen');
const imgZoom = document.getElementById('img-zoom');

function abrirModal() { modalCarrito.classList.remove('hidden'); }
function cerrarModal() { modalCarrito.classList.add('hidden'); }

function abrirModalImagen(src, alt) {
    imgZoom.src = src;
    imgZoom.alt = alt;
    modalImagen.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function cerrarModalImagen() {
    modalImagen.classList.add('hidden');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModal();
        cerrarModalImagen();
    }
});

modalCarrito.addEventListener('click', (e) => {
    if (e.target === modalCarrito) cerrarModal();
});

document.getElementById('btn-abrir-carrito').addEventListener('click', abrirModal);
document.getElementById('btn-cerrar-carrito').addEventListener('click', cerrarModal);

// --- WHATSAPP FINAL ---
document.getElementById('btn-enviar-whatsapp').addEventListener('click', () => {
    if (carrito.length === 0) return alert("Por favor, sume algún artículo a su pedido antes de enviar.");
    
    let mensaje = "Hola! Quisiera coordinar el pago y envío para el siguiente pedido de su catálogo online:\n\n";
    let total = 0;
    
    carrito.forEach(item => {
        mensaje += `- *${item.cantidad}x* ${item.nombre} \n`;
        mensaje += `   _Subtotal: $${item.precio * item.cantidad}_\n\n`;
        total += (item.precio * item.cantidad);
    });
    
    const formatTotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(total);
    mensaje += `*Total estimado: ${formatTotal}*\n`;
    
    const mensajeCodificado = encodeURIComponent(mensaje);
    window.open(`https://wa.me/${NUMERO_WA}?text=${mensajeCodificado}`, '_blank');
});

cargarProductos();
