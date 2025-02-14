import { supabase } from "./supabaseClient.js";

class RankingsApp {
  constructor() {
    this.currentMonth = new Date().getMonth() + 1; // Mês atual (1-12)
    this.currentYear = new Date().getFullYear(); // Ano atual
    this.setupMonthSelector();
    this.loadRankings();
  }

  setupMonthSelector() {
    const monthSelector = document.getElementById("month-selector");
    if (monthSelector) {
      // Preencher o seletor de meses
      const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      months.forEach((month, index) => {
        const option = document.createElement("option");
        option.value = index + 1;
        option.textContent = month;

        // Desabilitar meses futuros
        if (index + 1 > this.currentMonth) {
          option.disabled = true;
        }

        // Selecionar o mês atual por padrão
        if (index + 1 === this.currentMonth) {
          option.selected = true;
        }

        monthSelector.appendChild(option);
      });

      // Atualizar o ranking ao mudar o mês
      monthSelector.addEventListener("change", (e) => {
        this.currentMonth = parseInt(e.target.value);
        this.loadRankings();
      });
    }
  }

  async loadRankings() {
    const startDate = new Date(this.currentYear, this.currentMonth - 1, 1)
      .toISOString()
      .split("T")[0]; // Primeiro dia do mês
    const endDate = new Date(this.currentYear, this.currentMonth, 0)
      .toISOString()
      .split("T")[0]; // Último dia do mês

    // Buscar vendas concluídas no mês selecionado
    const { data: vendas, error } = await supabase
      .from("vendas")
      .select("*")
      .eq("statusOrdem", "CONCLUÍDO")
      .gte("dataVenda", startDate) // Vendas a partir do início do mês
      .lte("dataVenda", endDate); // Vendas até o final do mês

    if (error) {
      console.error("Erro ao carregar vendas para rankings:", error);
      this.renderError("Erro ao carregar vendas. Tente novamente mais tarde.");
      return;
    }

    if (!vendas || vendas.length === 0) {
      console.log("Nenhuma venda CONCLUÍDO encontrada para o mês selecionado.");
      this.renderError("Nenhuma venda encontrada para o mês selecionado.");
      return;
    }

    const supervisorMap = new Map();
    const vendedorMap = new Map();

    vendas.forEach((venda) => {
      const supervisor = venda.supervisor || "N/A";
      supervisorMap.set(supervisor, (supervisorMap.get(supervisor) || 0) + 1);

      const vendedor = venda.vendedor || "N/A";
      vendedorMap.set(vendedor, (vendedorMap.get(vendedor) || 0) + 1);
    });

    const supervisorRanking = Array.from(supervisorMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const vendedorRanking = Array.from(vendedorMap.entries())
      .sort((a, b) => b[1] - a[1]);

    this.renderSupervisorRanking(supervisorRanking);
    this.renderVendedorRanking(vendedorRanking);
  }

  renderSupervisorRanking(ranking) {
    const container = document.querySelector(".supervisor-ranking");
    if (!container) return;
    const html = ranking
      .map(
        (item, index) => `
      <div class="ranking-item">
        <div class="ranking-position">${index + 1}</div>
        <div class="ranking-info">
          <strong>${item[0]}</strong>
        </div>
        <div class="ranking-stats">
          <div><strong>${item[1]}</strong> vendas</div>
        </div>
      </div>
    `
      )
      .join("");
    container.innerHTML = `<h3>Ranking de Supervisores</h3>${html}`;
  }

  renderVendedorRanking(ranking) {
    const container = document.querySelector(".vendedor-ranking");
    if (!container) return;
    const html = ranking
      .map(
        (item, index) => `
      <div class="ranking-item">
        <div class="ranking-position">${index + 1}</div>
        <div class="ranking-info">
          <strong>${item[0]}</strong>
        </div>
        <div class="ranking-stats">
          <div><strong>${item[1]}</strong> vendas</div>
        </div>
      </div>
    `
      )
      .join("");
    container.innerHTML = `<h3>Ranking de Vendedores</h3>${html}`;
  }

  renderError(message) {
    const container = document.querySelector(".rankings-container");
    if (container) {
      container.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new RankingsApp();
});