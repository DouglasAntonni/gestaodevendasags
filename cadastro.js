import { supabase } from "./supabaseClient.js";

class CadastroApp {
  constructor() {
    this.vendas = [];
    this.page = 1;
    this.perPage = 10;
    this.setupForm();
    this.setupSearchFilters();
    this.loadVendas();
    this.setupEditModal();
  }

  setupForm() {
    const form = document.getElementById("venda-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.salvarVenda(form);
      });
    }
  }

  async salvarVenda(form) {
    const venda = {
      dataVenda: form.querySelector("#data-venda").value,
      responsavel: form.querySelector("#responsavel").value,
      cliente: form.querySelector("#cliente").value,
      login: form.querySelector("#login").value,
      cpf: form.querySelector("#cpf").value,
      vendedor: form.querySelector("#vendedor").value,
      supervisor: form.querySelector("#supervisor").value,
      oferta: form.querySelector("#oferta").value,
      valor: form.querySelector("#valor").value,
      biometria: form.querySelector("#biometria").value,
      ordem: form.querySelector("#ordem").value,
      statusOrdem: form.querySelector("#status-ordem").value,
      subStatusOrdem: form.querySelector("#sub-status-ordem").value,
      rede: form.querySelector("#rede").value,
      tipo: form.querySelector("#tipo").value,
      tipoCancelamento: form.querySelector("#tipo-cancelamento").value,
      estado: form.querySelector("#estado").value,
      agendamento1: form.querySelector("#agendamento-1").value,
      finalizado1: form.querySelector("#finalizado-1").value,
      motivo1: form.querySelector("#motivo-1").value,
      tratativa1: form.querySelector("#tratativa-1").value,
      observacao1: form.querySelector("#observacao-1").value,
      agendamento2: form.querySelector("#agendamento-2").value,
      finalizado2: form.querySelector("#finalizado-2").value,
      motivo2: form.querySelector("#motivo-2").value,
      tratativa2: form.querySelector("#tratativa-2").value,
      observacao2: form.querySelector("#observacao-2").value,
    };

    console.log("Dados da venda a serem enviados:", venda);

    const { data, error } = await supabase
      .from("vendas")
      .insert([venda])
      .select();

    if (error) {
      console.error("Erro ao salvar venda:", error);
      alert("Erro ao salvar venda. Verifique o console para mais detalhes.");
    } else {
      console.log("Venda salva com sucesso:", data);
      this.page = 1;
      this.loadVendas();
      form.reset();
    }
  }

  async loadVendas() {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .range((this.page - 1) * this.perPage, this.page * this.perPage - 1)
      .order("dataVenda", { ascending: false });

    if (error) {
      console.error("Erro ao carregar vendas:", error);
      return;
    }

    if (this.page === 1) {
      this.vendas = data;
    } else {
      this.vendas = [...this.vendas, ...data];
    }
    this.renderVendasTable();
    this.renderLoadMoreButton();
  }

  renderLoadMoreButton() {
    const loadMoreButton = document.getElementById("load-more-btn");
    if (loadMoreButton) {
      if (this.vendas.length > 0 && this.vendas.length % this.perPage === 0) {
        loadMoreButton.style.display = "block";
        loadMoreButton.onclick = () => {
          this.page++;
          this.loadVendas();
        };
      } else {
        loadMoreButton.style.display = "none";
      }
    }
  }
  
  renderVendasTable() {
    const tbody = document.getElementById("vendas-tbody");
    if (!tbody) {
      console.error("Elemento tbody não encontrado.");
      return;
    }

    if (!Array.isArray(this.vendas)) {
      console.error("this.vendas não é um array:", this.vendas);
      tbody.innerHTML =
        '<tr><td colspan="17">Erro ao carregar vendas.</td></tr>';
      return;
    }

    if (this.vendas.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="17">Nenhuma venda encontrada.</td></tr>';
      return;
    }

    tbody.innerHTML = this.vendas
      .map(
        (venda) => `
      <tr>
        <td>${venda.dataVenda}</td>
        <td>${venda.responsavel}</td> 
        <td>${venda.cliente}</td>
        <td>${venda.login}</td>
        <td>${venda.cpf}</td>
        <td>${venda.vendedor}</td>
        <td>${venda.supervisor}</td>
        <td>${venda.oferta}</td>
        <td>${venda.valor}</td>
        <td>${venda.biometria}</td>
        <td>${venda.ordem}</td>
        <td>${venda.statusOrdem}</td>
        <td>${venda.subStatusOrdem}</td>
        <td>${venda.rede}</td>
        <td>${venda.tipo}</td>
        <td>${venda.tipoCancelamento || "-"}</td>
        <td>${venda.estado}</td>
        <td class="btn-actions">
          <button onclick="window.app.abrirModalEdicao(${venda.id})" class="action-btn edit-btn">
            <i class="material-icons">edit</i>Editar
          </button>
          <button onclick="window.app.excluirVenda(${venda.id})" class="action-btn delete-btn">
            <i class="material-icons">delete</i>Excluir
          </button>
        </td>
      </tr>
    `
      )
      .join("");
    this.renderLoadMoreButton();
  }

  setupEditModal() {
    window.app = this;
  }

  async abrirModalEdicao(id) {
    const { data: venda, error } = await supabase
      .from("vendas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erro ao carregar venda para edição:", error);
      alert("Venda não encontrada.");
      return;
    }

    const modal = document.getElementById("modal-edicao");
    const modalContent = modal.querySelector(".modal-content");

    const editForm = document.createElement("form");
    editForm.id = "edicao-venda-form";
    editForm.innerHTML = `
      <h2>Editar Venda</h2>
      <div class="form-grid">
        ${this.createEditInputs(venda)}
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Salvar Alterações</button>
        <button type="button" class="btn-secondary" onclick="document.getElementById('modal-edicao').style.display = 'none'">Cancelar</button>
      </div>
    `;

    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.salvarEdicaoVenda(id, editForm);
    });

    modalContent.innerHTML = "";
    modalContent.appendChild(editForm);
    modal.style.display = "block";

    // Close modal if clicking outside the content
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  createEditInputs(venda) {
    return Object.entries(venda)
      .map(([key, value]) => {
        if (key === "id") return "";
        let inputType = "text";
        let inputOptions = "";

        switch (key) {
          case "dataVenda":
          case "agendamento1":
          case "agendamento2":
            inputType = "date";
            break;
          case "statusOrdem":
          case "subStatusOrdem":
          case "oferta":
          case "valor":
          case "estado":
          case "supervisor":
          case "biometria":
          case "tipo":
            inputType = "select";
            const options = {
              statusOrdem: [
                "CONCLUÍDO",
                "EM ANDAMENTO",
                "EM TRATAMENTO DOC/BIOMETRIA",
                "EM TRATAMENTO CTOP",
                "CANCELADA",
              ],
              subStatusOrdem: [
                "CONCLUÍDO",
                "EM ANDAMENTO",
                "EM TRATAMENTO DOC/BIOMETRIA",
                "CANCELADA",
                "AGENDADA",
                "EXECUÇÃO",
                "SEM SLOTS DE AGENDAMENTO",
                "PENDENCIADO",
                "FINALIZADO SEM SUCESSO",
                "ATRIBUÍDO",
                "ENTREGUE AO TÉCNICO",
                "EM DESLOCAMENTO",
                "NÃO ATRIBUÍDO",
                "FALHA SISTÊMICA",
                "NÃO ATRIBUÍDO",
                "ALÇADA",
                "CONCLUÍDO SEM SUCESSO",
                "RECEBIDO",
                "ERRO NO PROCESSAMENTO",
                "ERRO SERASA",
                "EM TRATAMENTO CTOP"
              ],
              oferta: [
                "TIM Fibra 300M 24",
                "TIM Fibra 400M 24",
                "TIM Fibra 600M 24",
                "TIM Fibra 600M P 24",
                "TIM Fibra 600M M 24",
                "TIM Fibra 1GB 24",
                "TIM Fibra 1GB P 24",
                "TIM Fibra 1GB M 24",
                "TIM Fibra 2GB 24",
              ],
              valor: ["90", "110", "130", "150", "160", "170", "180", "200"],
              estado: [
                "PERNAMBUCO",
                "BAHIA",
                "CEARÁ",
                "AMAZONAS",
                "MINAS GERAIS",
                "RIO DE JANEIRO",
              ],
              responsavel: [
                "Mine",
                "Raquel",
                "Jana",
                "Andreza",
                "Deivson",
                "Marcelo",
              ],
              supervisor: [
                "Pâmela Ingrid de Moura Santos",
                "Thaís Barbosa de Oliveira",
                "Guilherme Fernando C. dos Santos",
                "Willian Gabriel de Freitas Souza",
                "Alexsandra Gonçalves Cardoso",
                "Antônio Marcos de Brito Silva",
                "Genecy Germana Souza da Silva",
                "Marcelo Vinicius Bernardo de Moura",
                "Walcielison Candido de Andrade",
                "Suzanne Suellen de Freitas",
                "Parceiros",
              ],
              biometria: [
                "APROVADA",
                "EM ANDAMENTO",
                "NÃO FEZ",
                "REPROVADA",
              ],
              tipo:[
                "INPUT",
                "REINPUT",
                "CTOP",
                "ALÇADA",
              ],
              
            };
            inputOptions =
              options[key]
                ?.map(
                  (opt) =>
                    `<option value="${opt}" ${
                      opt === value ? "selected" : ""
                    }>${opt}</option>`
                )
                .join("") || "";
            break;
          default:
            inputType = "text";
            break;
        }
  
        const label = key
          .split(/(?=[A-Z])/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
  
        if (inputType === "select") {
          return `
          <div class="form-group">
            <label for="edit-${key}">${label}</label>
            <select id="edit-${key}" name="${key}">
              ${inputOptions}
            </select>
          </div>
        `;
        }
  
        return `
          <div class="form-group">
            <label for="edit-${key}">${label}</label>
            <input type="${inputType}" id="edit-${key}" name="${key}" value="${value || ""}">
          </div>
        `;
      })
      .join("");
  }

  async salvarEdicaoVenda(id, form) {
    const formData = new FormData(form);
    const updatedVenda = {};
    for (let [key, value] of formData.entries()) {
      updatedVenda[key] = value;
    }
    const { error } = await supabase
      .from("vendas")
      .update(updatedVenda)
      .eq("id", id);
    if (error) {
      console.error("Erro ao atualizar venda:", error);
      alert(
        "Erro ao atualizar venda. Verifique o console para mais detalhes."
      );
    } else {
      this.page = 1;
      this.loadVendas();
      document.getElementById("modal-edicao").style.display = "none";
    }
  }

  async excluirVenda(id) {
    const passwordModal = document.createElement("div");
    passwordModal.classList.add("password-modal");
    passwordModal.innerHTML = `
      <div class="password-modal-content">
        <h3>Confirmação de Exclusão</h3>
        <p>Digite a senha para excluir a venda:</p>
        <input type="password" id="exclusao-senha" class="senha-input" />
        <div class="form-actions">
          <button id="confirmar-exclusao" class="btn-primary">Confirmar</button>
          <button id="cancelar-exclusao" class="btn-secondary">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(passwordModal);
    const confirmarBtn = passwordModal.querySelector("#confirmar-exclusao");
    const cancelarBtn = passwordModal.querySelector("#cancelar-exclusao");
    const senhaInput = passwordModal.querySelector("#exclusao-senha");
    const removeModal = () => document.body.removeChild(passwordModal);
    cancelarBtn.addEventListener("click", removeModal);
    confirmarBtn.addEventListener("click", async () => {
      if (senhaInput.value === "AGS@2025") {
        const { error } = await supabase
          .from("vendas")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Erro ao excluir venda:", error);
          alert(
            "Erro ao excluir venda. Verifique o console para mais detalhes."
          );
        } else {
          this.page = 1;
          this.loadVendas();
        }
        removeModal();
      } else {
        alert("Senha incorreta!");
      }
    });
  }

  setupSearchFilters() {
    const searchInput = document.getElementById("search-input");
    const searchField = document.getElementById("search-field");
    const searchPeriod = document.getElementById("search-period");
    const searchButton = document.getElementById("search-button");
    const clearSearchButton = document.getElementById("clear-search");

    const debounce = (fn, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    };

    searchButton.addEventListener("click", () => this.performSearch());
    clearSearchButton.addEventListener("click", () => this.clearSearch());

    // Trigger search on pressing Enter
    searchInput.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        this.performSearch();
      }
    });

    // Automatically trigger search when user types with debounce
    searchInput.addEventListener("input", debounce(() => {
      this.performSearch();
    }, 300));
  }

  async performSearch() {
    const searchInputValue = document.getElementById("search-input").value.trim();
    const searchFieldValue = document.getElementById("search-field").value;
    const searchPeriodValue = document.getElementById("search-period").value;

    const { data: vendas, error } = await supabase
      .from("vendas")
      .select("*")
      .order("dataVenda", { ascending: false });

    if (error) {
      console.error("Erro ao buscar dados do Supabase:", error);
      return;
    }

    const normalizeText = (text) => {
      return String(text)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    };

    let filteredVendas = vendas;
    if (searchInputValue) {
      const searchWords = searchInputValue.split(/\s+/).map(word => normalizeText(word));
      filteredVendas = vendas.filter(venda => {
        const fieldContent = normalizeText(venda[searchFieldValue] || "");
        return searchWords.every(word => fieldContent.includes(word));
      });
    }

    if (searchPeriodValue && searchPeriodValue !== "all") {
      filteredVendas = this.filterSearchByPeriod(filteredVendas, searchPeriodValue);
    }

    this.renderSearchResults(filteredVendas);
    // Esconde o botão "Carregar Mais" durante a busca
    document.getElementById("load-more-btn").style.display = "none";
  }

  filterSearchByPeriod(vendas, period) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const filtered = vendas.filter((venda) => {
      const dataVenda = this.parseDate(venda.dataVenda);
      if (isNaN(dataVenda)) {
        console.warn(`Data inválida: ${venda.dataVenda}`);
        return false;
      }
      switch (period) {
        case "today":
          return this.isSameDay(dataVenda, hoje);
        case "thisWeek":
          const inicioSemana = new Date(hoje);
          const diaSemana = inicioSemana.getDay();
          const diferenca = diaSemana === 0 ? 6 : diaSemana - 1;
          inicioSemana.setDate(hoje.getDate() - diferenca);
          inicioSemana.setHours(0, 0, 0, 0);
          return dataVenda >= inicioSemana && dataVenda <= hoje;
        case "thisMonth":
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          return dataVenda >= inicioMes && dataVenda <= hoje;
        default:
          return true;
      }
    });
    return filtered.sort((a, b) => {
      const dataA = this.parseDate(a.dataVenda);
      const dataB = this.parseDate(b.dataVenda);
      return dataB - dataA;
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

  renderSearchResults(filteredVendas) {
    const tbody = document.getElementById("vendas-tbody");
    if (filteredVendas.length === 0) {
      tbody.innerHTML = `
      <tr>
        <td colspan="17" style="text-align: center;">Nenhuma venda encontrada</td>
      </tr>
    `;
      return;
    }
    tbody.innerHTML = filteredVendas
      .map(
        (venda) => `
      <tr>
        <td>${venda.dataVenda}</td>
        <td>${venda.responsavel}</td>
        <td>${venda.cliente}</td>
        <td>${venda.login}</td>
        <td>${venda.cpf}</td>
        <td>${venda.vendedor}</td>
        <td>${venda.supervisor}</td>
        <td>${venda.oferta}</td>
        <td>${venda.valor}</td>
        <td>${venda.biometria}</td>
        <td>${venda.ordem}</td>
        <td>${venda.statusOrdem}</td>
        <td>${venda.subStatusOrdem}</td>
        <td>${venda.rede}</td>
        <td>${venda.tipo}</td>
        <td>${venda.tipoCancelamento || '-'}</td>
        <td>${venda.estado}</td>
        <td class="btn-actions">
          <button onclick="window.app.abrirModalEdicao(${venda.id})" class="action-btn edit-btn">
            <i class="material-icons">edit</i>Editar
          </button>
          <button onclick="window.app.excluirVenda(${venda.id})" class="action-btn delete-btn">
            <i class="material-icons">delete</i>Excluir
          </button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  clearSearch() {
    document.getElementById("search-input").value = "";
    document.getElementById("search-field").value = "cliente";
    document.getElementById("search-period").value = "all";
    this.renderVendasTable();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CadastroApp();
});