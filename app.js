
(() => {
  const $ = id => document.getElementById(id);

  const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  const DEFAULTS = {
    Lunes:{theme:"Composición musical",items:[["Trabajo · 7:00 am – 5:00 pm","Trabajo y ahorro"],["Crear letras o melodías · 6:00 – 7:00 pm","Composición"],["Ensayo si está programado","Canto"]]},
    Martes:{theme:"Formación vocal",items:[["Trabajo · 7:00 am – 5:00 pm","Trabajo y ahorro"],["Clase de canto · 6:00 – 7:30 pm","Canto"],["Descanso y recuperación","Personal"]]},
    Miércoles:{theme:"Proyecto de acertijos",items:[["Trabajo · 7:00 am – 5:00 pm","Trabajo y ahorro"],["Desarrollar acertijos y mecánicas · 6:00 – 7:00 pm","Proyecto de acertijos"],["Ensayo si está programado","Canto"]]},
    Jueves:{theme:"Formación vocal",items:[["Trabajo · 7:00 am – 5:00 pm","Trabajo y ahorro"],["Clase de canto · 6:00 – 7:30 pm","Canto"],["Descanso o ensayo programado","Personal"]]},
    Viernes:{theme:"Composición musical",items:[["Trabajo · 7:00 am – 5:00 pm","Trabajo y ahorro"],["Avanzar en una canción propia · 6:00 – 7:00 pm","Composición"],["Ensayo si está programado","Canto"]]},
    Sábado:{theme:"Proyecto original",items:[["Desarrollo del proyecto · 1:30 – 2 horas","Proyecto de acertijos"],["Ensayo o evento, si corresponde","Canto"],["Tiempo personal y descanso","Personal"]]},
    Domingo:{theme:"Recuperación y organización",items:[["Descanso y desconexión","Personal"],["Revisar avances y ahorro","Trabajo y ahorro"],["Organizar la siguiente semana · 20 minutos","Personal"]]}
  };

  const localKey = "mi-universo-v1";
  const redirectUrl = "https://universocrisjace.github.io/UniversoCrisJace/";

  let state = loadLocal();
  let selectedDay = dayName(new Date());
  let weekOffset = 0;
  let supabase = null;
  let session = null;
  let syncing = false;

  const hasCloud = !!(
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY &&
    window.supabase
  );

  if (hasCloud) {
    supabase = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }

  function mondayOf(date) {
    const d = new Date(date);
    d.setHours(12,0,0,0);
    const day = (d.getDay()+6)%7;
    d.setDate(d.getDate()-day);
    return d;
  }

  function weekKey(offset=0) {
    const d = mondayOf(new Date());
    d.setDate(d.getDate()+offset*7);
    return d.toISOString().slice(0,10);
  }

  function dayName(date) {
    return DAYS[(date.getDay()+6)%7];
  }

  function fmt(d) {
    return d.toLocaleDateString("es-PE",{
      day:"numeric",
      month:"short"
    });
  }

  function currentWeek() {
    const key = weekKey(weekOffset);
    return state.weeks[key] || (state.weeks[key] = makeWeek());
  }

  function makeWeek() {
    const obj = {days:{},notes:""};

    DAYS.forEach(day => {
      obj.days[day] = {
        tasks:DEFAULTS[day].items.map((x,i)=>({
          id:makeId(day,i),
          title:x[0],
          category:x[1],
          done:false,
          custom:false
        })),
        theme:DEFAULTS[day].theme
      };
    });

    return obj;
  }

  function makeId(day="",i=0) {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${day}-${i}-${Date.now()}-${Math.random()}`;
  }

  function loadLocal() {
    try {
      const s = JSON.parse(localStorage.getItem(localKey));
      return s && s.weeks ? s : {weeks:{}};
    } catch {
      return {weeks:{}};
    }
  }

  function saveLocal() {
    localStorage.setItem(localKey,JSON.stringify(state));
  }

  function weekDates() {
    const d = mondayOf(new Date());
    d.setDate(d.getDate()+weekOffset*7);
    const e = new Date(d);
    e.setDate(e.getDate()+6);
    return [d,e];
  }

  function allTasks(week=currentWeek()) {
    return DAYS.flatMap(d=>week.days[d].tasks);
  }

  function render() {
    const loginScreen = $("loginScreen");
    const appShell = $("appShell");

    // Mostrar inicio de sesión o el organizador.
    if (loginScreen) {
      loginScreen.classList.toggle("hidden",!!session);
    }

    if (appShell) {
      appShell.classList.toggle("hidden",!session);
    }

    $("signOutBtn").classList.toggle("hidden",!session);

    // Actualizar información del organizador.
    const week = currentWeek();
    const tasks = allTasks(week);
    const done = tasks.filter(t=>t.done).length;
    const pct = tasks.length
      ? Math.round(done/tasks.length*100)
      : 0;

    $("percent").textContent = pct+"%";
    $("doneCount").textContent = done;
    $("totalCount").textContent = tasks.length;

    $("ringProgress").style.strokeDashoffset =
      421-(421*pct/100);

    $("barProgress").style.width = pct+"%";

    $("encouragement").textContent =
      pct===100
        ? "¡Semana completada! Date crédito por lo que lograste."
        : pct>=50
          ? "Vas avanzando. Mantén un ritmo que puedas sostener."
          : "Cada pequeño avance cuenta. No necesitas hacerlo todo hoy.";

    $("weekLabel").textContent =
      weekOffset===0
        ? "Semana actual"
        : weekOffset<0
          ? `${Math.abs(weekOffset)} semana(s) atrás`
          : `En ${weekOffset} semana(s)`;

    const [a,b] = weekDates();

    $("weekRange").textContent =
      `${fmt(a)} – ${fmt(b)}`;

    $("dayTabs").innerHTML = DAYS.map(d => {
      const ts = week.days[d].tasks;
      const n = ts.filter(t=>t.done).length;

      return `
        <button class="day-tab ${selectedDay===d?"active":""}" data-day="${d}">
          ${d.slice(0,3)}
          <span>${n}/${ts.length}</span>
        </button>
      `;
    }).join("");

    $("dayTabs").querySelectorAll("button").forEach(b => {
      b.addEventListener("click",()=>{
        selectedDay = b.dataset.day;
        renderDay();
        renderTabs();
      });
    });

    renderDay();
    renderTabs();

    $("weeklyNotes").value = week.notes || "";

    $("todayLabel").textContent =
      new Date().toLocaleDateString("es-PE",{
        weekday:"long",
        day:"numeric",
        month:"long"
      });

    $("connection").classList.toggle("online",!!session);

    $("connection").innerHTML = session
      ? "<i></i> Sincronizado"
      : "<i></i> Local";

    if (session) {
      $("authMessage").textContent =
        `Sesión iniciada: ${session.user.email}. Tus cambios se sincronizan cuando hay conexión.`;
    }
  }

  function renderTabs() {
    const week = currentWeek();

    $("dayTabs").querySelectorAll("button").forEach(b => {
      b.classList.toggle(
        "active",
        b.dataset.day===selectedDay
      );

      const ts = week.days[b.dataset.day].tasks;

      b.querySelector("span").textContent =
        `${ts.filter(t=>t.done).length}/${ts.length}`;
    });
  }

  function renderDay() {
    const day = currentWeek().days[selectedDay];
    const tasks = day.tasks;
    const done = tasks.filter(t=>t.done).length;

    $("dayContent").innerHTML = `
      <h3 class="day-title">${selectedDay} · ${day.theme}</h3>

      <p class="day-subtitle">
        Haz lo que puedas. Si aparece un ensayo o evento, ajusta el plan sin culpa.
      </p>

      <div class="task-list">
        ${tasks.map(t=>`
          <div class="task ${t.done?"done":""}" data-id="${t.id}">
            <input
              type="checkbox"
              ${t.done?"checked":""}
              aria-label="Marcar ${escapeHtml(t.title)}"
            >

            <span class="task-text">
              ${escapeHtml(t.title)}
            </span>

            <span class="task-category">
              ${escapeHtml(t.category)}
            </span>

            <button
              class="delete-task"
              title="Eliminar actividad"
              aria-label="Eliminar actividad"
            >×</button>
          </div>
        `).join("")}
      </div>
    `;

    $("dayProgress").textContent =
      `${done} de ${tasks.length} actividades completadas`;

    $("dayContent").querySelectorAll(".task").forEach(el => {
      const id = el.dataset.id;
      const cb = el.querySelector("input");

      cb.addEventListener("change",()=>{
        const t = tasks.find(x=>x.id===id);
        t.done = cb.checked;
        saveAndSync();
        render();
      });

      el.querySelector(".delete-task").addEventListener("click",()=>{
        day.tasks = day.tasks.filter(x=>x.id!==id);
        saveAndSync();
        render();
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g,c=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[c]));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");

    setTimeout(()=>{
      el.classList.remove("show");
    },2300);
  }

  function saveAndSync() {
    saveLocal();

    if (session) {
      syncWeek();
    }
  }

  async function syncWeek() {
    if (!supabase || !session || syncing) return;

    syncing = true;

    try {
      const key = weekKey(weekOffset);
      const payload = currentWeek();

      const {error} = await supabase
        .from("weekly_plans")
        .upsert({
          user_id:session.user.id,
          week_start:key,
          data:payload,
          updated_at:new Date().toISOString()
        },{
          onConflict:"user_id,week_start"
        });

      if (error) throw error;

      $("saveStatus").textContent =
        "Sincronizado con tu cuenta.";

    } catch(e) {
      $("saveStatus").textContent =
        "Guardado localmente. No se pudo sincronizar.";

      console.warn(e);

    } finally {
      syncing = false;
    }
  }

  async function pullWeek() {
    if (!supabase || !session) return;

    try {
      const key = weekKey(weekOffset);

      const {data,error} = await supabase
        .from("weekly_plans")
        .select("data")
        .eq("user_id",session.user.id)
        .eq("week_start",key)
        .maybeSingle();

      if (error) throw error;

      if (data?.data) {
        state.weeks[key] = data.data;
        saveLocal();
        render();
      } else {
        await syncWeek();
      }

    } catch(e) {
      console.warn(e);
      toast("No se pudo descargar la semana. Revisa tu conexión.");
    }
  }

  // INICIAR SESIÓN Y CREAR CUENTA
  async function auth(action) {
    if (!supabase) {
      $("authMessage").textContent =
        "No se pudo conectar con Supabase. Revisa la configuración.";
      return;
    }

    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || password.length<6) {
      $("authMessage").textContent =
        "Escribe tu correo y una contraseña de al menos 6 caracteres.";
      return;
    }

    $("signInBtn").disabled = true;
    $("signUpBtn").disabled = true;
    $("authMessage").textContent = "Conectando…";

    try {
      let result;

      if (action==="signup") {
        result = await supabase.auth.signUp({
          email,
          password
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password
        });
      }

      if (result.error) {
        $("authMessage").textContent = result.error.message;
        return;
      }

      if (action==="signup" && !result.data.session) {
        $("authMessage").textContent =
          "¡Cuenta creada! Revisa tu correo para confirmar tu dirección. Después podrás iniciar sesión.";
        return;
      }

      session = result.data.session;

      if (session) {
        render();
        await pullWeek();
        toast("¡Bienvenido a Mi Universo!");
      }

    } catch(e) {
      console.error(e);

      $("authMessage").textContent =
        "No se pudo conectar. Comprueba tu internet e inténtalo nuevamente.";

    } finally {
      $("signInBtn").disabled = false;
      $("signUpBtn").disabled = false;
    }
  }

  // RECUPERAR CONTRASEÑA
  async function resetPassword() {
    if (!supabase) {
      $("authMessage").textContent =
        "No se pudo conectar con Supabase.";
      return;
    }

    const email = $("email").value.trim();

    if (!email) {
      $("authMessage").textContent =
        "Primero escribe tu correo electrónico.";
      return;
    }

    $("authMessage").textContent =
      "Enviando correo de recuperación…";

    $("resetPasswordBtn").disabled = true;

    try {
      const {error} = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:redirectUrl
        }
      );

      if (error) throw error;

      $("authMessage").textContent =
        "Si el correo está registrado, recibirás un enlace para recuperar tu contraseña. Revisa también el correo no deseado.";

    } catch(e) {
      console.error(e);

      $("authMessage").textContent =
        "No se pudo enviar el correo. Revisa la configuración de URLs de Supabase.";

    } finally {
      $("resetPasswordBtn").disabled = false;
    }
  }

  // BOTONES DE ACCESO
  $("signInBtn").addEventListener("click",()=>{
    auth("signin");
  });

  $("signUpBtn").addEventListener("click",()=>{
    auth("signup");
  });

  $("resetPasswordBtn").addEventListener("click",()=>{
    resetPassword();
  });

  $("signOutBtn").addEventListener("click",async()=>{
    if (supabase) {
      await supabase.auth.signOut();
    }

    session = null;
    render();

    $("authMessage").textContent =
      "Has cerrado sesión. ¡Hasta pronto!";

    toast("Sesión cerrada.");
  });

  // CAMBIAR SEMANAS
  $("prevWeek").addEventListener("click",async()=>{
    weekOffset--;
    selectedDay = dayName(new Date());
    render();
    await pullWeek();
  });

  $("nextWeek").addEventListener("click",async()=>{
    weekOffset++;
    selectedDay = dayName(new Date());
    render();
    await pullWeek();
  });

  // AÑADIR ACTIVIDADES
  $("addTaskBtn").addEventListener("click",()=>{
    if ($("taskDialog").showModal) {
      $("taskDialog").showModal();
    } else {
      toast("Tu navegador no admite este cuadro.");
    }
  });

  $("taskForm").addEventListener("submit",e=>{
    e.preventDefault();

    const title = $("taskTitle").value.trim();

    if (!title) return;

    currentWeek().days[selectedDay].tasks.push({
      id:makeId(),
      title,
      category:$("taskCategory").value,
      done:false,
      custom:true
    });

    $("taskDialog").close();
    $("taskTitle").value = "";

    saveAndSync();
    render();

    toast("Actividad añadida.");
  });

  // GUARDAR NOTAS
  $("saveNotesBtn").addEventListener("click",()=>{
    currentWeek().notes = $("weeklyNotes").value;

    saveAndSync();

    $("saveStatus").textContent = session
      ? "Guardando en la nube…"
      : "Guardado en este dispositivo.";

    toast("Nota guardada.");
  });

  // CAMBIAR TEMA
  $("themeBtn").addEventListener("click",()=>{
    document.body.classList.toggle("light");

    localStorage.setItem(
      "mi-universo-light",
      document.body.classList.contains("light")?"1":"0"
    );
  });

  if (localStorage.getItem("mi-universo-light")==="1") {
    document.body.classList.add("light");
  }

  // RECUPERAR SESIÓN Y SINCRONIZAR
  if (supabase) {
    supabase.auth.getSession().then(async({data,error})=>{
      if (error) {
        console.warn(error);
        return;
      }

      session = data.session;
      render();

      if (session) {
        await pullWeek();
      }
    });

    supabase.auth.onAuthStateChange((_event,s)=>{
      session = s;
      render();
    });
  } else {
    $("authMessage").textContent =
      "No se pudo conectar con el servicio de cuentas. Revisa la configuración.";
  }

  // RECONECTAR CUANDO VUELVA INTERNET
  window.addEventListener("online",()=>{
    if (session) {
      syncWeek();
    }
  });

  // REGISTRAR SERVICE WORKER
  if (
    "serviceWorker" in navigator &&
    location.protocol!=="file:"
  ) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(console.warn);
  }

  render();

})();
