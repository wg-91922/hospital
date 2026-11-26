
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
      consultas: Array.isArray(data.consultas) ? data.consultas : []
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
