import { supabase } from "./supabaseClient.js";

class DashboardApp {
  constructor() {
    this.charts = {
      vendasPorEstado: null,
      statusOrdens: null,
      metasEstados: null,
    };
    this.dados = { metricas: {} };
    this.setupDashboard();
    this.updateDashboard();
    this.subscribeToVendas();
 
  }

  setupDashboard() {
    const periodFilter = document.getElementById("period-filter");
    periodFilter.addEventListener("change", () => this.updateDashboard());
  }

  async updateDashboard() {
    const period = document.getElementById("period-filter").value || "daily";
    await this.computeDashboardData(period);
    this.renderStateCards();
    this.renderCharts();
  }

  async computeDashboardData(period = 'daily') {
    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('*');

    if (error) {
      console.error('Erro ao carregar vendas:', error);
      return;
    }

    const vendasFiltradas = this.filterByPeriod(vendas, period);

    // Variáveis para métricas gerais
    let ofertasCount = {};
    let totalValor = 0;
    let totalVendasConcluidas = 0;

    // Meta diária por estado
    const metaDiaria = {
      'PERNAMBUCO': 316,
      'BAHIA': 75,
      'CEARÁ': 285,
      'AMAZONAS': 100,
      'MINAS GERAIS': 300,
      'RIO DE JANEIRO': 75
    };

    const estadoData = {};

    vendasFiltradas.forEach(venda => {
      const estado = venda.estado;

      // Inicializa os dados do estado, se necessário
      if (!estadoData[estado]) {
        estadoData[estado] = {
          total: 0,
          concluidas: 0,
          emAndamento: 0,
          biometriaTotal: 0,
          biometriaAprovada: 0,
          biometriaEmAndamento: 0,
          biometriaNaoFez: 0,
          biometriaReprovada: 0,
          canceladas: 0,
          emTratamento: 0,
          emTratamentoCtop: 0,
          reinput: 0,
          meta: 0,
          vendedores: []
        };
      }

      // Contagem geral de vendas por estado
      estadoData[estado].total++;

      // Verifica se a venda foi concluída
      if (venda.statusOrdem === 'CONCLUÍDO') {
        estadoData[estado].concluidas++;
        totalVendasConcluidas++;

        // Soma o valor da venda concluída
        totalValor += parseFloat(venda.valor) || 0;

        // Conta a oferta da venda concluída
        ofertasCount[venda.oferta] = (ofertasCount[venda.oferta] || 0) + 1;
      }
      if (venda.tipo === 'REINPUT') {
        estadoData[estado].reinput++;
      }
      // Outros status
      switch (venda.statusOrdem) {
        case 'EM ANDAMENTO':
          estadoData[estado].emAndamento++;
          break;
        case 'EM TRATAMENTO CTOP':
          estadoData[estado].emTratamentoCtop++;
          break;
        case 'EM TRATAMENTO DOC/BIOMETRIA':
          estadoData[estado].emTratamento++;
          break;
        case 'CANCELADA':
          estadoData[estado].canceladas++;
          break;
      }

      // Contagem de biometria
      if (venda.biometria) {
        estadoData[estado].biometriaTotal++;
        switch (venda.biometria) {
          case 'APROVADA':
            estadoData[estado].biometriaAprovada++;
            break;
          case 'EM ANDAMENTO':
            estadoData[estado].biometriaEmAndamento++;
            break;
          case 'NÃO FEZ':
            estadoData[estado].biometriaNaoFez++;
            break;
          case 'REPROVADA':
            estadoData[estado].biometriaReprovada++;
            break;
        }
      }

      // Adiciona vendedor ao estado
      const vendedorExistente = estadoData[estado].vendedores.find(v => v.nome === venda.vendedor);
      if (vendedorExistente) {
        vendedorExistente.vendas++;
      } else {
        estadoData[estado].vendedores.push({
          id: venda.id,
          nome: venda.vendedor,
          supervisor: venda.supervisor,
          estado: venda.estado,
          vendas: 1,
          taxaConversao: 80 // Exemplo de taxa de conversão
        });
      }
    });

    // Calcula a meta atingida por estado
    Object.keys(estadoData).forEach(estado => {
      const meta = metaDiaria[estado] || 75; // Meta padrão
      const concluidas = estadoData[estado].concluidas;
      estadoData[estado].meta = Math.round((concluidas / meta) * 100);
    });

    // Calcula a oferta mais vendida
    const ofertaMaisVendida = Object.entries(ofertasCount)
      .sort(([, a], [, b]) => b - a)[0] || ['Nenhuma', 0];

    // Calcula o ticket médio
    const ticketMedio = totalVendasConcluidas > 0
      ? (totalValor / totalVendasConcluidas).toFixed(2)
      : 0;

    // Armazena os dados
    this.dados = {
      ...estadoData,
      metricas: {
        ofertaMaisVendida: {
          nome: ofertaMaisVendida[0],
          quantidade: ofertaMaisVendida[1]
        },
        ticketMedio: ticketMedio
      }
    };
  }

  filterByPeriod(vendas, period) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999); // Fim do dia atual

    let inicioPeriodo = new Date(hoje);
    inicioPeriodo.setHours(0, 0, 0, 0); // Início do dia atual

    switch (period) {
      case 'weekly':
        inicioPeriodo.setDate(hoje.getDate() - hoje.getDay()); // Primeiro dia da semana (domingo)
        break;
      case 'monthly':
        inicioPeriodo.setDate(1); // Primeiro dia do mês
        break;
      // Diário é o padrão
    }

    return vendas.filter(venda => {
      try {
        const [dia, mes, ano] = venda.dataVenda.split('/');
        const dataVenda = new Date(`${ano}-${mes}-${dia}`);
        return dataVenda >= inicioPeriodo && dataVenda <= hoje;
      } catch (e) {
        console.error('Erro ao processar data da venda:', venda.dataVenda);
        return false;
      }
    });
  }

  renderStateCards() {
    const stateCardsContainer = document.querySelector('.state-cards');
    stateCardsContainer.innerHTML = ''; // Limpa antes de renderizar

    const fragment = document.createDocumentFragment(); // Reduz operações no DOM

    // Criar e adicionar métricas gerais
    fragment.appendChild(this.createMetricsCard(this.dados?.metricas || {}));

    // Criar e adicionar os cards de estados
    Object.entries(this.dados || {}).forEach(([estado, dadosEstado]) => {
      if (estado !== 'metricas') {
        fragment.appendChild(this.createStateCard(estado, dadosEstado));
      }
    });

    stateCardsContainer.appendChild(fragment);

    // Chamar função para adicionar eventos apenas uma vez
    this.addBiometriaClickEvents();
  }

  createMetricsCard(metricas) {
    const metricsCard = document.createElement('div');
    metricsCard.className = 'metrics-card';
    metricsCard.innerHTML = `
      <h3>Métricas Gerais</h3>
      <div class="metrics-group">
        <div class="metric">
          <span>Oferta Mais Vendida</span>
          <strong>${metricas.ofertaMaisVendida?.nome || 'N/A'}</strong>
        </div>
        <div class="metric">
          <span>Ticket Médio</span>
          <strong>R$ ${metricas.ticketMedio || '0.00'}</strong>
        </div>
      </div>
    `;
    return metricsCard;
  }

  createStateCard(estado, dadosEstado) {
    const card = document.createElement('div');
    card.className = 'card';

    // Define classe da meta
    const metaClass =
      dadosEstado.meta >= 80 ? 'badge-success' :
        dadosEstado.meta >= 70 ? 'badge-warning' : 'badge-error';

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
        <span>Reinput</span>
        <strong>${dadosEstado.reinput || 0}</strong>
      </div>
      <div class="metric">
        <span>Em Andamento</span>
        <strong>${dadosEstado.emAndamento || 0}</strong>
      </div>
      <div class="metric">
        <span>Canceladas</span>
        <strong>${dadosEstado.canceladas || 0}</strong>
      </div>
      <div class="metric">
        <span>Meta Atingida</span>
        <div class="badge ${metaClass}">
          ${dadosEstado.meta || 0}%
        </div>
      </div>
    `;

    return card;
  }

  addBiometriaClickEvents() {
    const biometricElements = document.querySelectorAll('.biometria-clickable');

    biometricElements.forEach(element => {
      const periodSelect = element.querySelector('.period-select');

      element.addEventListener('click', (event) => {
        event.stopPropagation();
        // Oculta todos os outros selects antes de exibir o atual
        document.querySelectorAll('.period-select').forEach(select => {
          if (select !== periodSelect) {
            select.classList.remove('visible');
          }
        });

        // Alterna visibilidade do select
        periodSelect.classList.toggle('visible');
      });

      // Evento de mudança no select para abrir modal
      periodSelect.addEventListener('change', (event) => {
        const estado = element.getAttribute('data-estado');
        const period = event.target.value;
        this.openBiometriaModal(estado, period);
        periodSelect.classList.remove('visible');
      });

      // Esconde selects ao clicar fora
      document.addEventListener('click', (event) => {
        if (!element.contains(event.target)) {
          periodSelect.classList.remove('visible');
        }
      });
    });
  }

  async openBiometriaModal(estado, selectedPeriod = 'daily') {
    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('*');

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      return;
    }

    const vendasFiltradas = this.filterByPeriod(vendas, selectedPeriod);
    const estadoVendas = vendasFiltradas.filter(venda => venda.estado === estado);

    const biometriaData = {
      'APROVADA': 0,
      'EM ANDAMENTO': 0,
      'REPROVADA': 0,
      'NÃO FEZ': 0
    };

    estadoVendas.forEach(venda => {
      const status = venda.biometria || 'NÃO FEZ';
      biometriaData[status]++;
    });

    const periodTitle = {
      'daily': 'Hoje',
      'weekly': 'Esta Semana',
      'monthly': 'Este Mês'
    };

    const modal = document.createElement('div');
    modal.className = 'biometria-modal';
    modal.style.opacity = '0';
    modal.innerHTML = `
      <div class="biometria-modal-content">
        <button class="close-btn">&times;</button>
        <h2>Status da Biometria</h2>
        <div class="period-title">${estado} - ${periodTitle[selectedPeriod]}</div>
        <div class="biometria-stats">
          <div class="stat-item aprovada">
            <span>Aprovada</span>
            <strong>${biometriaData['APROVADA']}</strong>
          </div>
          <div class="stat-item em-andamento">
            <span>Em Andamento</span>
            <strong>${biometriaData['EM ANDAMENTO']}</strong>
          </div>
          <div class="stat-item reprovada">
            <span>Reprovada</span>
            <strong>${biometriaData['REPROVADA']}</strong>
          </div>
          <div class="stat-item nao-fez">
            <span>Não Realizou</span>
            <strong>${biometriaData['NÃO FEZ']}</strong>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add fade-in effect
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
    });

    // Closing functionality
    const closeModal = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    };

    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Add escape key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  renderCharts() {
    if (this.charts.vendasPorEstado) this.charts.vendasPorEstado.destroy();
    if (this.charts.statusOrdens) this.charts.statusOrdens.destroy();
    if (this.charts.metasEstados) this.charts.metasEstados.destroy();

    const chartColors = [
      "#2196F3",
      "#1976D2",
      "#1565C0",
      "#0D47A1",
      "#64B5F6",
      "#42A5F5",
      "#2196F3",
      "#1E88E5",
    ];

    const chartConfig = {
      plugins: {
        legend: {
          labels: { color: "var(--text-color)" },
        },
        title: {
          color: "var(--text-color)",
          font: { size: 16, weight: "bold" },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    };

    this.charts.vendasPorEstado = new Chart(
      document.getElementById("vendas-por-estado-chart"),
      {
        type: "bar",
        data: {
          labels: Object.keys(this.dados).filter(key => key !== "metricas"),
          datasets: [
            {
              label: "Vendas Concluídas",
              data: Object.keys(this.dados)
                .filter(key => key !== "metricas")
                .map((estado) => this.dados[estado].concluidas),
              backgroundColor: chartColors[0],
            },
          ],
        },
        options: {
          ...chartConfig,
          plugins: {
            ...chartConfig.plugins,
            title: { display: true, text: "Vendas por Estado" },
          },
        },
      }
    );

    this.charts.statusOrdens = new Chart(
      document.getElementById("status-ordens-chart"),
      {
        type: "doughnut",
        data: {
          labels: ["Concluídas", "Em Andamento", "Canceladas"],
          datasets: [
            {
              data: [
                Object.keys(this.dados)
                  .filter(key => key !== "metricas")
                  .reduce((acc, key) => acc + this.dados[key].concluidas, 0),
                Object.keys(this.dados)
                  .filter(key => key !== "metricas")
                  .reduce((acc, key) => acc + this.dados[key].emAndamento, 0),
                Object.keys(this.dados)
                  .filter(key => key !== "metricas")
                  .reduce((acc, key) => acc + this.dados[key].canceladas, 0),
              ],
              backgroundColor: chartColors.slice(0, 3),
            },
          ],
        },
        options: {
          ...chartConfig,
          plugins: {
            ...chartConfig.plugins,
            title: { display: true, text: "Status das Ordens" },
          },
        },
      }
    );

    this.charts.metasEstados = new Chart(
      document.getElementById("metas-estados-chart"),
      {
        type: "radar",
        data: {
          labels: Object.keys(this.dados).filter(key => key !== "metricas"),
          datasets: [
            {
              label: "Meta Atingida (%)",
              data: Object.keys(this.dados)
                .filter(key => key !== "metricas")
                .map((estado) => this.dados[estado].meta),
              backgroundColor: "rgba(33, 150, 243, 0.2)",
              borderColor: "rgba(33, 150, 243, 1)",
              pointBackgroundColor: "rgba(33, 150, 243, 1)",
              pointBorderColor: "#fff",
            },
          ],
        },
        options: {
          ...chartConfig,
          plugins: {
            ...chartConfig.plugins,
            title: { display: true, text: "Metas por Estado" },
          },
        },
      }
    );
  }

  subscribeToVendas() {
    supabase
      .from('vendas')
      .on('UPDATE', payload => {
        // Se a venda foi previamente categorizada como "REINPUT" e agora foi alterada para um tipo diferente:
        if (payload.old && payload.new && payload.old.tipo === 'REINPUT' && payload.new.tipo !== 'REINPUT') {
          console.log('Venda atualizada de REINPUT para outro tipo:', payload);
          this.updateDashboard();
        }
      })
      .subscribe();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new DashboardApp();
});