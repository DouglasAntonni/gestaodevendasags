import { supabase } from "./supabaseClient.js";

class RankingsApp {
  constructor() {
    this.loadRankings();
  }

  async loadRankings() {
    const { data: vendas, error } = await supabase.from("vendas").select("*");
    if (error) {
      console.error("Erro ao carregar vendas para rankings:", error);
      return;
    }

    const supervisorMap = new Map();
    const vendedorMap = new Map();

    vendas.forEach((venda) => {
      const supervisor = venda.supervisor || "N/A";
      if (supervisorMap.has(supervisor)) {
        supervisorMap.set(supervisor, supervisorMap.get(supervisor) + 1);
      } else {
        supervisorMap.set(supervisor, 1);
      }

      const vendedor = venda.vendedor || "N/A";
      if (vendedorMap.has(vendedor)) {
        vendedorMap.set(vendedor, vendedorMap.get(vendedor) + 1);
      } else {
        vendedorMap.set(vendedor, 1);
      }
    });

    const supervisorRanking = Array.from(supervisorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const vendedorRanking = Array.from(vendedorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

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
}

document.addEventListener("DOMContentLoaded", () => {
  new RankingsApp();
});