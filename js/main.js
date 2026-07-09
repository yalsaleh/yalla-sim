function getWhatsAppUrl() {
  const params = new URLSearchParams();
  if (WHATSAPP_MESSAGE) {
    params.set("text", WHATSAPP_MESSAGE);
  }
  const query = params.toString();
  return `https://wa.me/${WHATSAPP_NUMBER}${query ? "?" + query : ""}`;
}

function initWhatsAppLinks() {
  const url = getWhatsAppUrl();
  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = url;
  });
}

function initSplash() {
  const splash = document.getElementById("splash");
  const page = document.getElementById("page");

  if (!splash || !page) return;

  // Bottom → top: dot, then the line, then sim, then yalla
  const sequence = [
    { sel: ".logo-part--dot",   delay: 400 },
    { sel: ".logo-part--arc",   delay: 1100 },
    { sel: ".logo-part--sim",   delay: 1800 },
    { sel: ".logo-part--yalla", delay: 2500 },
  ];

  sequence.forEach(({ sel, delay }) => {
    setTimeout(() => splash.querySelector(sel)?.classList.add("show"), delay);
  });

  setTimeout(() => {
    splash.classList.add("hidden");
    page.classList.add("visible");
  }, 4200);
}

function initSmoothAnimation() {
  const bg = document.querySelector('.hero__showcase-bg');
  if (!bg) return;
  
  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;

  // Track mouse
  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    targetMouseY = (e.clientY / window.innerHeight) - 0.5;
  });

  // Animation Loop
  function animate() {
    // Parallax mouse smoothing
    currentMouseX += (targetMouseX - currentMouseX) * 0.08;
    currentMouseY += (targetMouseY - currentMouseY) * 0.08;
    
    // READ SCROLL DIRECTLY (No LERP = Zero lag against native scrolling)
    const scrollY = window.scrollY;
    
    // Scale up as you scroll
    const scrollScale = 1 + (scrollY * 0.015);
    
    // Parallax shift
    const shiftX = currentMouseX * 5; 
    const shiftY = currentMouseY * 5; 
    
    // Use translate3d to force hardware (GPU) acceleration.
    // Notice we REMOVED border-radius updates. Updating border-radius in JS 
    // triggers CPU layout recalculations every frame (which causes lag).
    // Scaling a static rounded box naturally pushes the corners off screen seamlessly!
    bg.style.transform = `translate3d(calc(-50% + ${shiftX}%), calc(-40% + ${shiftY}%), 0) scale(${scrollScale})`;

    requestAnimationFrame(animate);
  }
  
  // Start loop
  animate();
}

document.addEventListener("DOMContentLoaded", () => {
  initWhatsAppLinks();
  initSplash();
  initSmoothAnimation();
});
