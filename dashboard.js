import { supabase } from "./supabaseClient.js";

class DashboardApp {
  constructor() {
    this.vendas = [];
    this.periodFilter = document.getElementById("period-filter");
    this.managerFilter = document.getElementById("manager-filter");
    this.stateCardsContainer = document.querySelector(".state-cards");
    this.supervisorFilter = document.getElementById("supervisor-filter");
    // Chart instances
    this.stateChart = null;
    this.statusChart = null;
    this.metaChart = null;
    this.biometriaChart = null;
    // Metas estáticas por estado
    this.metasVendas = {
      "PERNAMBUCO": 209,
      "BAHIA": 120,
      "CEARÁ": 300,
      "AMAZONAS": 75,
      "MINAS GERAIS": 305,
      "RIO DE JANEIRO": 70
    };
    // Initialize filters and load data
    this.initializeFilters();
    this.loadVendas();
    window.addEventListener("saleUpdated", this.loadVendas.bind(this));
  }

  initializeFilters() {
    if (this.periodFilter) {
      this.periodFilter.addEventListener("change", () => this.applyFilters());
    }
    if (this.managerFilter) {
      this.managerFilter.addEventListener("change", () => this.applyFilters());
    }
    if (this.supervisorFilter) {
      this.supervisorFilter.addEventListener("change", () => this.applyFilters());
    }
  }

  async loadVendas() {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .order("dataVenda", { ascending: false });
    if (error) {
      console.error("Erro ao carregar vendas:", error);
      return;
    }
    this.vendas = data;
    this.applyFilters();
  }

  applyFilters() {
    const period = this.periodFilter.value; // daily, weekly, monthly
    const manager = this.managerFilter.value; // e.g., "all", "Taciana", "Dourado"
    const supervisor = this.supervisorFilter.value; // e.g., "all", "Pâmela Ingrid de Moura Santos", etc.
    
    let filtered = this.filterByPeriod(this.vendas, period);
  
    // Filtro por gerente
    if (manager !== "all") {
      filtered = filtered.filter(venda => {
        const gerente = this.normalize(venda.gerente);
        return gerente && gerente === this.normalize(manager);
      });
    }
  
    // Filtro por supervisor
    if (supervisor !== "all") {
      filtered = filtered.filter(venda => {
        const sup = this.normalize(venda.supervisor);
        return sup && sup === this.normalize(supervisor);
      });
    }
  
    console.log("Vendas filtradas:", filtered);
    
    this.renderStateCards(filtered);
    this.renderCharts(filtered);
  }
  
  normalize(str) {
    return (str || "")
      .normalize("NFD") // Remove acentos
      .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos
      .toLowerCase() // Converte para minúsculas
      .trim(); // Remove espaços em branco
  }

  normalize(str) {
    return (str || "").trim().toLowerCase();
  }

  filterByPeriod(vendas, period) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return vendas.filter(venda => {
      const dataVenda = this.parseDate(venda.dataVenda);
      if (isNaN(dataVenda)) return false;
      switch (period) {
        case "daily":
          return this.isSameDay(dataVenda, today);
        case "weekly":
          const startOfWeek = this.getStartOfWeek(today);
          return dataVenda >= startOfWeek && dataVenda <= today;
        case "monthly":
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return dataVenda >= startOfMonth && dataVenda <= today;
        default:
          return true;
      }
    });
  }

  parseDate(dateString) {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (dateString.includes("-")) {
      return new Date(dateString);
    }
    if (dateString.includes("/")) {
      const [dia, mes, ano] = dateString.split("/");
      return new Date(ano, mes - 1, dia);
    }
    return new Date(dateString);
  }

  isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
  }

  getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  renderStateCards(filteredVendas) {
    this.stateCardsContainer.innerHTML = "";
    const uniqueStates = [...new Set(filteredVendas.map(venda => venda.estado))];
    uniqueStates.forEach(state => {
      const metrics = this.calculateStateMetrics(filteredVendas, state);
      const card = this.createStateCard(state, metrics);
      this.stateCardsContainer.appendChild(card);
    });
    this.addBiometriaClickEvents();
  }

  calculateStateMetrics(vendas, state) {
    const stateVendas = vendas.filter(v => v.estado === state);
    const total = stateVendas.length;
    const concluidas = stateVendas.filter(v => v.statusOrdem === "CONCLUÍDO").length;
    const biometriaAprovada = stateVendas.filter(v => v.biometria === "APROVADA").length;
    const emTratamentoCtop = stateVendas.filter(v => v.statusOrdem === "EM TRATAMENTO CTOP").length;
    const emTratamento = stateVendas.filter(v => v.statusOrdem === "EM TRATAMENTO DOC/BIOMETRIA").length;
    const emAndamento = stateVendas.filter(v => v.statusOrdem === "EM ANDAMENTO").length;
    const canceladas = stateVendas.filter(v => v.statusOrdem === "CANCELADA").length;
    const reinput = stateVendas.filter(v => v.tipo === "REINPUT").length; 
    // Meta de vendas para o estado
    const metaVendas = this.metasVendas[state] || 0; // Se não houver meta, use 0

    // Percentual de vendas atingido
    const percentualAtingido = metaVendas > 0 ? Math.round((total / metaVendas) * 100) : 0;
    
    
    return {
      total,
      concluidas,
      biometriaAprovada,
      emTratamentoCtop,
      emTratamento,
      emAndamento,
      canceladas,
      reinput,
      metaVendas, // Meta de vendas
      percentualAtingido ,
      
    };
  }

  createStateCard(estado, dadosEstado) {
    const metaClass =
      dadosEstado.percentualAtingido >= 80 ? "badge-success" :
      dadosEstado.percentualAtingido >= 70 ? "badge-warning" : "badge-error";
     
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${estado}</h3>
      <div class="metric">
        <span>Total de Ordens</span>
        <strong>${dadosEstado.total || 0}</strong>
      </div>
      <div class="metric">
        <span>Concluídas</span>
        <strong>${dadosEstado.concluidas || 0}</strong>
      </div>
      <div class="metric biometria-clickable" data-estado="${estado}">
        <span>Biometria Aprovada</span>
        <strong>${dadosEstado.biometriaAprovada || 0}</strong>
        <select class="period-select">
          <option value="default" selected>Selecione o Período</option>
          <option value="daily">Hoje</option>
          <option value="weekly">Esta Semana</option>
          <option value="monthly">Este Mês</option>
        </select>
      </div>
      <div class="metric">
        <span>Em Tratamento CTOP</span>
        <strong>${dadosEstado.emTratamentoCtop || 0}</strong>
      </div>
      <div class="metric">
        <span>Em Tratamento Doc/Biometria</span>
        <strong>${dadosEstado.emTratamento || 0}</strong>
      </div>
      <div class="metric">
        <span>Em Andamento</span>
        <strong>${dadosEstado.emAndamento || 0}</strong>
      </div>
      <div class="metric">
        <span>Reinput</span>
        <strong>${dadosEstado.reinput || 0}</strong>
      </div>
      <div class="metric">
        <span>Canceladas</span>
        <strong>${dadosEstado.canceladas || 0}</strong>
      </div>
       <div class="metric">
        <span>Meta Atingida</span>
        <div class="badge ${metaClass}">
          ${dadosEstado.percentualAtingidoDiario || 0}%
        </div>
      <div class="metric">
        <span>Meta Atingida</span>
        <div class="badge ${metaClass}">
          ${dadosEstado.percentualAtingido || 0}%
        </div>
      </div>
    `;
    return card;
  }

  addBiometriaClickEvents() {
    const biometricElements = document.querySelectorAll(".biometria-clickable");
    biometricElements.forEach(element => {
      const periodSelect = element.querySelector(".period-select");
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        document.querySelectorAll(".period-select").forEach(select => {
          if (select !== periodSelect) {
            select.classList.remove("visible");
          }
        });
        periodSelect.classList.toggle("visible");
      });
      periodSelect.addEventListener("change", (event) => {
        const estado = element.getAttribute("data-estado");
        const period = event.target.value;
        this.openBiometriaModal(estado, period);
        periodSelect.classList.remove("visible");
      });
      document.addEventListener("click", (event) => {
        if (!element.contains(event.target)) {
          periodSelect.classList.remove("visible");
        }
      });
    });
  }

  async openBiometriaModal(estado, selectedPeriod = "daily") {
    const { data: vendas, error } = await supabase.from("vendas").select("*");
    if (error) {
      console.error("Erro ao buscar vendas:", error);
      return;
    }
    const vendasFiltradas = this.filterByPeriod(vendas, selectedPeriod);
    const estadoVendas = vendasFiltradas.filter(venda => venda.estado === estado);
    const biometriaData = { "APROVADA": 0, "EM ANDAMENTO": 0, "REPROVADA": 0, "NÃO FEZ": 0 };
    estadoVendas.forEach(venda => {
      const status = venda.biometria || "NÃO FEZ";
      if (biometriaData.hasOwnProperty(status)) {
        biometriaData[status]++;
      }
    });
    const periodTitle = {
      "daily": "Hoje",
      "weekly": "Esta Semana",
      "monthly": "Este Mês"
    };
    const modal = document.createElement("div");
    modal.className = "biometria-modal";
    modal.style.opacity = "0";
    modal.innerHTML = `
      <div class="biometria-modal-content">
        <button class="close-btn">&times;</button>
        <h2>Status da Biometria</h2>
        <div class="period-title">${estado} - ${periodTitle[selectedPeriod] || selectedPeriod}</div>
        <div class="biometria-stats">
          <div class="stat-item aprovada">
            <span>Aprovada</span>
            <strong>${biometriaData["APROVADA"]}</strong>
          </div>
          <div class="stat-item em-andamento">
            <span>Em Andamento</span>
            <strong>${biometriaData["EM ANDAMENTO"]}</strong>
          </div>
          <div class="stat-item reprovada">
            <span>Reprovada</span>
            <strong>${biometriaData["REPROVADA"]}</strong>
          </div>
          <div class="stat-item nao-fez">
            <span>Não Realizou</span>
            <strong>${biometriaData["NÃO FEZ"]}</strong>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      modal.style.opacity = "1";
    });
    const closeModal = () => {
      modal.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    };
    const closeBtn = modal.querySelector(".close-btn");
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    const escListener = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escListener);
      }
    };
    document.addEventListener("keydown", escListener);
  }

  renderCharts(filteredVendas) {
    // Chart 1: Vendas por Estado (Bar Chart)
    const stateCounts = {};
    filteredVendas.forEach(venda => {
      const state = venda.estado || "Desconhecido";
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });
    const ctxState = document.getElementById("vendas-por-estado-chart").getContext("2d");
    if (this.stateChart) { this.stateChart.destroy(); }
    this.stateChart = new Chart(ctxState, {
      type: "bar",
      data: {
        labels: Object.keys(stateCounts),
        datasets: [{
          label: "Vendas por Estado",
          data: Object.values(stateCounts),
          backgroundColor: "rgba(13, 71, 161, 0.7)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // Chart 2: Status das Ordens (Pie Chart)
    const statusCounts = {};
    filteredVendas.forEach(venda => {
      const status = venda.statusOrdem || "Desconhecido";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const ctxStatus = document.getElementById("status-ordens-chart").getContext("2d");
    if (this.statusChart) { this.statusChart.destroy(); }
    this.statusChart = new Chart(ctxStatus, {
      type: "pie",
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          label: "Status das Ordens",
          data: Object.values(statusCounts),
          backgroundColor: [
            "rgba(76, 175, 80, 0.7)",    // ex: CONCLUÍDO
            "rgba(33, 150, 243, 0.7)",   // ex: EM ANDAMENTO
            "rgba(255, 193, 7, 0.7)",    // ex: EM TRATAMENTO DOC/BIOMETRIA
            "rgba(156, 39, 176, 0.7)",   // ex: EM TRATAMENTO CTOP
            "rgba(244, 67, 54, 0.7)",    // ex: CANCELADA
            "rgba(120, 120, 120, 0.7)"   // fallback
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    // Chart 3: Metas por Estado (Bar Chart showing meta percentage)
    const stateMetrics = {};
    filteredVendas.forEach(venda => {
      const state = venda.estado || "Desconhecido";
      if (!stateMetrics[state]) {
        stateMetrics[state] = { total: 0, concluido: 0 };
      }
      stateMetrics[state].total++;
      if (venda.statusOrdem === "CONCLUÍDO") {
        stateMetrics[state].concluido++;
      }
    });
    const stateMetas = {};
    Object.keys(stateMetrics).forEach(state => {
      const { total, concluido } = stateMetrics[state];
      stateMetas[state] = total > 0 ? Math.round((concluido / total) * 100) : 0;
    });
    const ctxMeta = document.getElementById("metas-estados-chart").getContext("2d");
    if (this.metaChart) { this.metaChart.destroy(); }
    this.metaChart = new Chart(ctxMeta, {
      type: "bar",
      data: {
        labels: Object.keys(stateMetas),
        datasets: [{
          label: "Meta Atingida (%)",
          data: Object.values(stateMetas),
          backgroundColor: "rgba(255, 87, 34, 0.7)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Percentual (%)"
            }
          }
        }
      }
    });

    // Chart 4: Biometria (Doughnut Chart for biometria status)
    const biometriaCounts = { "APROVADA": 0, "EM ANDAMENTO": 0, "NÃO FEZ": 0, "REPROVADA": 0 };
    filteredVendas.forEach(venda => {
      const bio = venda.biometria || "NÃO FEZ";
      if (biometriaCounts.hasOwnProperty(bio)) {
        biometriaCounts[bio]++;
      } else {
        biometriaCounts[bio] = 1;
      }
    });
    const ctxBio = document.getElementById("biometria-chart").getContext("2d");
    if (this.biometriaChart) { this.biometriaChart.destroy(); }
    this.biometriaChart = new Chart(ctxBio, {
      type: "doughnut",
      data: {
        labels: Object.keys(biometriaCounts),
        datasets: [{
          label: "Status da Biometria",
          data: Object.values(biometriaCounts),
          backgroundColor: [
            "rgba(76, 175, 80, 0.7)",   // APROVADA
            "rgba(33, 150, 243, 0.7)",  // EM ANDAMENTO
            "rgba(255, 152, 0, 0.7)",   // NÃO FEZ
            "rgba(244, 67, 54, 0.7)"    // REPROVADA
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
    
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new DashboardApp();
});