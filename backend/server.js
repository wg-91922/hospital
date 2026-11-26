const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

const estoqueInicial = [
    { id: 1, nome: "Dipirona", quantidade: 100, unidade: "comprimidos", categoria: "Analgésico/Antipirético" },
    { id: 2, nome: "Paracetamol", quantidade: 80, unidade: "comprimidos", categoria: "Analgésico/Antipirético" },
    { id: 3, nome: "Ibuprofeno", quantidade: 60, unidade: "comprimidos", categoria: "Anti-inflamatório" },
    { id: 4, nome: "Amoxicilina", quantidade: 50, unidade: "cápsulas", categoria: "Antibiótico" },
    { id: 5, nome: "Azitromicina", quantidade: 40, unidade: "comprimidos", categoria: "Antibiótico" },
    { id: 6, nome: "Loratadina", quantidade: 70, unidade: "comprimidos", categoria: "Antialérgico" },
    { id: 7, nome: "Omeprazol", quantidade: 90, unidade: "cápsulas", categoria: "Protetor Gástrico" },
    { id: 8, nome: "Buscopan", quantidade: 50, unidade: "comprimidos", categoria: "Antiespasmódico" },
    { id: 9, nome: "Dramin", quantidade: 45, unidade: "comprimidos", categoria: "Antiemético" },
    { id: 10, nome: "Soro fisiológico", quantidade: 120, unidade: "frascos", categoria: "Solução" }
];

function readDB() {
    let db = {};

    if (fs.existsSync(DB_FILE)) {
        try {
            db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
        } catch (erro) {
            throw new Error("O arquivo db.json está inválido.");
        }
    }

    db.usuarios = Array.isArray(db.usuarios) ? db.usuarios : [];
    db.pacientes = Array.isArray(db.pacientes) ? db.pacientes : [];
    db.triagens = Array.isArray(db.triagens) ? db.triagens : [];
    db.consultas = Array.isArray(db.consultas) ? db.consultas : [];
    db.tvAtual = db.tvAtual || null;
    db.tvHistorico = Array.isArray(db.tvHistorico) ? db.tvHistorico : [];
    db.estoque = Array.isArray(db.estoque) ? db.estoque : [];

    if (db.estoque.length === 0) {
        db.estoque = estoqueInicial.map(m => ({ ...m }));
        writeDB(db);
    }

    return db;
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function proximoId(lista) {
    return lista.length
        ? Math.max(...lista.map(item => Number(item.id) || 0)) + 1
        : 1;
}

// INÍCIO
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// LOGIN
app.post("/login", (req, res) => {
    const db = readDB();

    const usuario = db.usuarios.find(u =>
        u.usuario === req.body.usuario &&
        u.senha === req.body.senha
    );

    if (!usuario) {
        return res.status(401).json({ erro: "Login inválido." });
    }

    res.json({
        id: usuario.id,
        usuario: usuario.usuario,
        tipo: usuario.tipo
    });
});

// USUÁRIOS
app.get("/usuarios", (req, res) => {
    const db = readDB();

    res.json(db.usuarios.map(u => ({
        id: u.id,
        usuario: u.usuario,
        tipo: u.tipo
    })));
});

app.post("/usuarios", (req, res) => {
    const usuario = String(req.body.usuario || "").trim();
    const senha = String(req.body.senha || "");
    const tipo = String(req.body.tipo || "");

    if (!usuario || !senha || !tipo) {
        return res.status(400).json({ erro: "Preencha todos os campos." });
    }

    if (!["atendimento", "triagem", "medico"].includes(tipo)) {
        return res.status(400).json({ erro: "Setor inválido." });
    }

    const db = readDB();

    if (db.usuarios.some(u => u.usuario.toLowerCase() === usuario.toLowerCase())) {
        return res.status(400).json({ erro: "Usuário já cadastrado." });
    }

    const novo = {
        id: Date.now(),
        usuario,
        senha,
        tipo
    };

    db.usuarios.push(novo);
    writeDB(db);

    res.status(201).json({
        mensagem: "Usuário cadastrado!",
        usuario: { id: novo.id, usuario: novo.usuario, tipo: novo.tipo }
    });
});

app.delete("/usuarios/:id", (req, res) => {
    const db = readDB();
    const id = Number(req.params.id);
    const indice = db.usuarios.findIndex(u => u.id === id);

    if (indice === -1) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    db.usuarios.splice(indice, 1);
    writeDB(db);

    res.json({ mensagem: "Usuário excluído." });
});

// ATENDIMENTO
app.post("/atendimento", (req, res) => {
    const nome = String(req.body.nome || "").trim();
    const cpf = String(req.body.cpf || "").trim();
    const tipo = String(req.body.tipo || "").trim();

    if (!nome || !cpf) {
        return res.status(400).json({ erro: "Nome e CPF são obrigatórios." });
    }

    const db = readDB();

    const paciente = {
        id: Date.now(),
        nome,
        cpf,
        tipo,
        status: "triagem",
        createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);
    writeDB(db);

    res.status(201).json(paciente);
});

// TRIAGEM
app.post("/triagem", (req, res) => {
    const db = readDB();

    const nome = String(req.body.nome || "").trim();

    if (!nome) {
        return res.status(400).json({ erro: "Nome do paciente obrigatório." });
    }

    const triagem = {
        id: Date.now(),
        nome,
        sintoma: req.body.sintoma || "",
        temperatura: req.body.temperatura ?? "",
        alergia: req.body.alergia || "",
        observacao: req.body.observacao || "",
        risco: req.body.risco || "verde",
        status: "aguardando_medico",
        createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);
    writeDB(db);

    res.status(201).json({
        mensagem: "Triagem salva com sucesso!",
        triagem
    });
});

// LISTAR TRIAGENS
app.get("/triagens", (req, res) => {
    const db = readDB();

    res.json(
        db.triagens.slice().reverse()
    );
});

// ESTOQUE
app.get("/estoque", (req, res) => {
    res.json(readDB().estoque);
});

app.post("/estoque", (req, res) => {
    const nome = String(req.body.nome || "").trim();
    const quantidade = Number(req.body.quantidade);
    const unidade = String(req.body.unidade || "unidades");
    const categoria = String(req.body.categoria || "Geral");

    if (!nome) {
        return res.status(400).json({ erro: "Informe o nome do medicamento." });
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return res.status(400).json({ erro: "Quantidade inicial inválida." });
    }

    const db = readDB();

    const existente = db.estoque.find(
        m => m.nome.toLowerCase() === nome.toLowerCase()
    );

    if (existente) {
        return res.status(400).json({
            erro: "Medicamento já cadastrado. Use Repor estoque."
        });
    }

    const medicamento = {
        id: proximoId(db.estoque),
        nome,
        quantidade,
        unidade,
        categoria
    };

    db.estoque.push(medicamento);
    writeDB(db);

    res.status(201).json({
        mensagem: "Medicamento cadastrado com sucesso!",
        medicamento
    });
});

app.patch("/estoque/:id", (req, res) => {
    const db = readDB();
    const id = Number(req.params.id);

    const medicamento = db.estoque.find(m => m.id === id);

    if (!medicamento) {
        return res.status(404).json({ erro: "Medicamento não encontrado." });
    }

    const quantidade = Number(req.body.quantidade);

    if (!Number.isInteger(quantidade)) {
        return res.status(400).json({ erro: "Quantidade inválida." });
    }

    if (req.body.operacao === "adicionar") {
        if (quantidade <= 0) {
            return res.status(400).json({ erro: "Informe uma quantidade positiva." });
        }
        medicamento.quantidade += quantidade;
    } else if (req.body.operacao === "remover") {
        if (quantidade <= 0 || quantidade > medicamento.quantidade) {
            return res.status(400).json({ erro: "Quantidade para remoção inválida." });
        }
        medicamento.quantidade -= quantidade;
    } else {
        if (medicamento.quantidade + quantidade < 0) {
            return res.status(400).json({ erro: "O estoque não pode ficar negativo." });
        }
        medicamento.quantidade += quantidade;
    }

    writeDB(db);

    res.json({
        mensagem: "Estoque atualizado!",
        medicamento
    });
});

app.delete("/estoque/:id", (req, res) => {
    const db = readDB();
    const id = Number(req.params.id);
    const indice = db.estoque.findIndex(m => m.id === id);

    if (indice === -1) {
        return res.status(404).json({ erro: "Medicamento não encontrado." });
    }

    db.estoque.splice(indice, 1);
    writeDB(db);

    res.json({ mensagem: "Medicamento removido do estoque." });
});

app.get("/lista-medicacoes", (req, res) => {
    const db = readDB();

    res.json(
        db.estoque
            .filter(m => (m.quantidade ?? 0) > 0)
            .map(m => ({
                id: m.id,
                nome: m.nome,
                quantidade: m.quantidade ?? 0,
                unidade: m.unidade || "unidades",
                categoria: m.categoria || "Geral"
            }))
    );
});

// CONSULTAS
app.post("/consulta", (req, res) => {
    const paciente = String(req.body.paciente || "").trim();
    const diagnostico = String(req.body.diagnostico || "").trim();
    const medicacao = String(req.body.medicacao || "").trim();
    const obs = String(req.body.obs || "").trim();
    const quantidade = Number(req.body.quantidade);

    if (!paciente || !medicacao) {
        return res.status(400).json({
            erro: "Selecione um paciente e uma medicação."
        });
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return res.status(400).json({
            erro: "Informe uma quantidade válida."
        });
    }

    const db = readDB();

    const medicamentoEstoque = db.estoque.find(
        m => m.nome.toLowerCase() === medicacao.toLowerCase()
    );

    if (!medicamentoEstoque) {
        return res.status(404).json({
            erro: "Medicamento não encontrado no estoque."
        });
    }

    if (medicamentoEstoque.quantidade < quantidade) {
        return res.status(400).json({
            erro: "Estoque insuficiente."
        });
    }

    medicamentoEstoque.quantidade -= quantidade;

    const consulta = {
        id: Date.now(),
        paciente,
        diagnostico,
        medicacao,
        quantidade,
        unidade: medicamentoEstoque.unidade,
        obs,
        createdAt: new Date().toISOString()
    };

    db.consultas.push(consulta);
    writeDB(db);

    res.status(201).json({
        mensagem: "Consulta salva e estoque atualizado!",
        consulta,
        estoqueAtual: medicamentoEstoque.quantidade,
        unidade: medicamentoEstoque.unidade
    });
});

app.get("/medicacoes", (req, res) => {
    res.json(readDB().consultas);
});

// ALTA
app.post("/alta", (req, res) => {
    const paciente = String(req.body.paciente || "").trim();

    if (!paciente) {
        return res.status(400).json({ erro: "Paciente não informado." });
    }

    const db = readDB();

    const triagem = db.triagens.find(
        t => t.nome.toLowerCase() === paciente.toLowerCase()
    );

    if (triagem) {
        triagem.status = "alta";
        triagem.dataAlta = new Date().toISOString();
    }

    writeDB(db);

    res.json({ mensagem: "Alta registrada." });
});

// TELÃO - CHAMAR PACIENTE
app.post("/tv/chamar", (req, res) => {
    const paciente = String(req.body.paciente || "").trim();
    const localTipo = String(req.body.localTipo || "GUICHÊ").trim();
    const localNumero = String(req.body.localNumero || "").trim();

    if (!paciente || !localNumero) {
        return res.status(400).json({
            erro: "Informe o paciente e o número do guichê."
        });
    }

    const db = readDB();

    const chamada = {
        id: Date.now(),
        paciente,
        localTipo,
        localNumero,
        data: new Date().toISOString()
    };

    db.tvAtual = chamada;
    db.tvHistorico.unshift(chamada);
    db.tvHistorico = db.tvHistorico.slice(0, 20);

    const triagem = db.triagens.find(
        t => t.nome.toLowerCase() === paciente.toLowerCase()
    );

    if (triagem) {
        triagem.status = "chamado";
    }

    writeDB(db);

    res.json({
        mensagem: "Paciente enviado para o telão!",
        chamada
    });
});

// CONSULTAR CHAMADAS DO TELÃO
app.get("/tv/chamada", (req, res) => {
    const db = readDB();

    res.json({
        chamada: db.tvAtual,
        historico: db.tvHistorico
    });
});
app.delete("/triagens/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const i = db.triagens.findIndex(t => t.id === id);
  if (i === -1) return res.status(404).json({ erro: "Não achado" });
  db.triagens.splice(i, 1);
  writeDB(db);
  res.json({ ok: true });
});
// INICIAR SERVIDOR
app.listen(PORT, "0.0.0.0", () => {
    console.log("==================================");
    console.log("       HOSPITAL PRO INICIADO");
    console.log("==================================");
    console.log(`Sistema: http://localhost:${PORT}/`);
    console.log(`Triagem: http://localhost:${PORT}/triagem.html`);
    console.log(`Telão: http://localhost:${PORT}/tv.html`);
    console.log("==================================");
});
