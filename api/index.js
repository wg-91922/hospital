const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// ======================================
// CONFIGURAÇÕES
// ======================================

app.use(express.json());
app.use(cors());

app.use(express.static(
  path.join(__dirname, "../frontend")
));

// ======================================
// BANCO DE DADOS
// ======================================

// O banco está dentro da pasta backend
const DB_FILE = path.join(
  __dirname,
  "../backend/db.json"
);

console.log("Caminho do banco:", DB_FILE);

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(
      "Arquivo db.json não encontrado em: " + DB_FILE
    );
  }

  try {
    const data = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

    return {
      usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
      pacientes: Array.isArray(data.pacientes) ? data.pacientes : [],
      triagens: Array.isArray(data.triagens) ? data.triagens : [],
      consultas: Array.isArray(data.consultas) ? data.consultas : [],
      tvAtual: data.tvAtual || null,
      tvHistorico: Array.isArray(data.tvHistorico) ? data.tvHistorico : [],
      estoque: Array.isArray(data.estoque) ? data.estoque : []
    };

  } catch (error) {
    console.error("Erro ao ler banco:", error);
    throw error;
  }
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// ======================================
// ROTA INICIAL
// ======================================

app.get("/", (req, res) => {
  res.send("Sistema Hospitalar funcionando!");
});

// ======================================
// LOGIN
// ======================================

app.post("/login", (req, res) => {
  try {
    const db = readDB();

    const usuario = String(
      req.body.usuario || ""
    ).trim();

    const senha = String(
      req.body.senha || ""
    );

    console.log("Tentativa de login:", usuario);

    console.log(
      "Usuários encontrados:",
      db.usuarios.map(u => u.usuario)
    );

    const user = db.usuarios.find(u =>
      String(u.usuario || "").trim() === usuario &&
      String(u.senha || "") === senha
    );

    if (!user) {
      return res.status(401).json({
        erro: "Login inválido"
      });
    }

    console.log("Login realizado:", usuario);

    return res.json({
      usuario: user.usuario,
      tipo: user.tipo
    });

  } catch (error) {
    console.error("Erro no login:", error);

    return res.status(500).json({
      erro: "Erro interno ao realizar login"
    });
  }
});

// ======================================
// ATENDIMENTO
// ======================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome,
      cpf: req.body.cpf,
      tipo: req.body.tipo,
      status: "triagem",
      createdAt: new Date()
    };

    db.pacientes.push(paciente);
    writeDB(db);

    res.json(paciente);

  } catch (error) {
    console.error("Erro no atendimento:", error);
    res.status(500).json({
      erro: "Erro ao cadastrar paciente"
    });
  }
});

// ======================================
// TRIAGEM
// ======================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;
    const temperatura = Number(req.body.temperatura);

    if (temperatura >= 39) {
      risco = "vermelho";
    } else if (temperatura >= 38) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),
      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura: req.body.temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco,
      status: "aguardando_medico",
      createdAt: new Date()
    };

    db.triagens.push(triagem);
    writeDB(db);

    res.json(triagem);

  } catch (error) {
    console.error("Erro na triagem:", error);
    res.status(500).json({
      erro: "Erro ao registrar triagem"
    });
  }
});

// ======================================
// LISTAR TRIAGENS
// ======================================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();
    res.json(db.triagens);

  } catch (error) {
    console.error("Erro ao listar triagens:", error);
    res.status(500).json({
      erro: "Erro ao buscar triagens"
    });
  }
});

// ======================================
// LISTA DE MEDICAÇÕES
// ======================================

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// ======================================
// CONSULTA
// ======================================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),
      paciente: req.body.paciente,
      diagnostico: req.body.diagnostico,
      medicacao: req.body.medicacao,
      obs: req.body.obs,
      createdAt: new Date()
    };

    db.consultas.push(consulta);
    writeDB(db);

    res.json(consulta);

  } catch (error) {
    console.error("Erro na consulta:", error);
    res.status(500).json({
      erro: "Erro ao registrar consulta"
    });
  }
});

// ======================================
// MEDICAÇÕES
// ======================================

app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();
    res.json(db.consultas);

  } catch (error) {
    console.error("Erro ao buscar medicações:", error);
    res.status(500).json({
      erro: "Erro ao buscar medicações"
    });
  }
});

// ======================================
// VERIFICAR BANCO
// ======================================

app.get("/status-banco", (req, res) => {
  try {
    const db = readDB();

    res.json({
      funcionando: true,
      usuarios: db.usuarios.length,
      pacientes: db.pacientes.length,
      triagens: db.triagens.length,
      consultas: db.consultas.length
    });

  } catch (error) {
    res.status(500).json({
      funcionando: false,
      erro: error.message
    });
  }
});

app.delete("/triagens/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.triagens = db.triagens.filter(t => t.id !== id);
  writeDB(db);
  res.json({ ok: true });
});

// ======================================
// TELÃO
// ======================================

app.post("/tv/chamar", (req, res) => {
  const db = readDB();
  const b = req.body || {};
  const chamada = {
    id: Date.now(),
    paciente: String(b.paciente || b.nome || b.nomePaciente || "").trim(),
    localTipo: String(b.localTipo || b.tipo || "GUICHÊ").trim(),
    localNumero: String(b.localNumero || b.guiche || b.numero || b.local || "").trim(),
    data: new Date().toISOString()
  };
  if (!chamada.paciente || !chamada.localNumero) {
    return res.status(400).json({
      erro: "Informe paciente e guichê.",
      recebido: b
    });
  }
  db.tvAtual = chamada;
  db.tvHistorico = [chamada, ...(db.tvHistorico || [])].slice(0, 20);
  writeDB(db);
  res.json({ mensagem: "Paciente enviado!", chamada });
});

app.get("/tv/chamada", (req, res) => {
  const db = readDB();
  res.json({
    chamada: db.tvAtual || null,
    historico: db.tvHistorico || []
  });
});

// ======================================
// ESTOQUE / ALMOXARIFADO
// ======================================

app.get("/estoque", (req, res) => {
  try {
    const db = readDB();
    res.json(db.estoque);
  } catch (error) {
    console.error("Erro ao buscar estoque:", error);
    res.status(500).json({
      erro: "Erro ao buscar estoque"
    });
  }
});

app.post("/estoque", (req, res) => {
  try {
    const db = readDB();
    const b = req.body || {};
    const item = {
      id: Date.now(),
      nome: String(b.nome || b.medicamento || "").trim(),
      quantidade: Number(b.quantidade || b.quantidadeInicial || 0),
      unidade: String(b.unidade || "Comprimidos"),
      categoria: String(b.categoria || ""),
      createdAt: new Date().toISOString()
    };
    if (!item.nome) {
      return res.status(400).json({
        erro: "Informe o nome do medicamento"
      });
    }
    db.estoque.push(item);
    writeDB(db);
    res.json(item);
  } catch (error) {
    console.error("Erro ao registrar medicamento:", error);
    res.status(500).json({
      erro: "Erro ao registrar medicamento"
    });
  }
});

app.put("/estoque/:id", (req, res) => {
  const db = readDB();
  const item = db.estoque.find(x => x.id === Number(req.params.id));
  if (!item) {
    return res.status(404).json({
      erro: "Não encontrado"
    });
  }
  if (req.body.quantidade !== undefined) item.quantidade = Number(req.body.quantidade);
  if (req.body.nome) item.nome = req.body.nome;
  if (req.body.unidade) item.unidade = req.body.unidade;
  if (req.body.categoria) item.categoria = req.body.categoria;
  writeDB(db);
  res.json(item);
});

app.delete("/estoque/:id", (req, res) => {
  const db = readDB();
  db.estoque = db.estoque.filter(x => x.id !== Number(req.params.id));
  writeDB(db);
  res.json({ ok: true });
});

// ======================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Sistema Hospitalar rodando na porta ${PORT}`
    );
  });
}

// ======================================
// EXPORTAÇÃO
// ======================================

module.exports = app;
