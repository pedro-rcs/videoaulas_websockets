/* Este servidor utilizas as portas...

443: Para fornecer o site em si. 443 é a padrão do https, também é a porta do websocket.
1935: Porta do RTMP. O servidor recebe os chunks do vídeo pela porta 443 do websocket e converte em RTMP, desaguando este RTMP na porta 1935.
8443: O sistema então lê o RTMP na 1935 e converte para HLS, desaguando este HLS na porta 8433.
Então o cliente RECEBEDOR ouvirá a 8443 para receber o vídeo pelo HLS.

27017: Ainda utilizamos a 21017 para a conexão com o banco de dados local MongoDB.
*/

const Socket = require('websocket')
const NodeMediaServer = require('node-media-server')
const bcrypt = require('bcrypt')
const express = require('express')
const session = require('express-session')
const mongoose = require('mongoose')
const cors = require('cors')
const fs = require('fs-extra')
const bodyParser = require('body-parser')
const https = require('https')
const http = require('http')
const path = require('path')
var cp = require('child_process')

// Certificados da letsencrypt
const privateKey = fs.readFileSync('/etc/letsencrypt/live/maisumservidor.ddnsking.com/privkey.pem', 'utf8')
const certificate = fs.readFileSync('/etc/letsencrypt/live/maisumservidor.ddnsking.com/cert.pem', 'utf8')
const ca = fs.readFileSync('/etc/letsencrypt/live/maisumservidor.ddnsking.com/chain.pem', 'utf8')

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
}

/* Schemas Mongoose - Início */

// Conecta pelo Mongoose com nosso MongoDB local
mongoose.connect('mongodb://localhost:27017/transmissoes_video', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }) 

const Schema = mongoose.Schema

const mensagens_schema = new Schema({
  tipo: String,
  id_cliente: String,
  remetente: String,
  funcao: String,
  mensagem: String
})

const sala_de_transmissao_schema = new Schema({
  endereco: String,
  mensagens: [mensagens_schema]
})

const Sala_de_Transmissao = mongoose.model('sala_de_transmissao', sala_de_transmissao_schema)
/* Schemas Mongoose - Fim */

const jsonParser = bodyParser.json()
const app = express()

app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

const server = https.createServer(credentials, app)

server.listen(3011, () => { console.log("Servidor na :3011, quando funcionava era na 443") })

// Conversão do sinal rtmp para o hls
// Primeiro ajeitamos as configurações...
const config_rtmp_hls = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*'
  },
  https: {
    port: 8443,
    key:'/etc/letsencrypt/live/maisumservidor.ddnsking.com/privkey.pem',
    cert:'/etc/letsencrypt/live/maisumservidor.ddnsking.com/cert.pem'
  },
  trans: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        vc: "copy",
        vcParam: [],
        ac: "aac",
        acParam: ['-ab', '64k', '-ac', '1', '-ar', '44100'],
        rtmp:true,
        rtmpApp:'live2',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  }
}

var nms = new NodeMediaServer(config_rtmp_hls) // Depois criamos uma nova instância do NodeMediaServer e rodamos a bagaça.
nms.run()


var processo_child_ffmpeg
var x = 0
let clientes = []

const webSocket = new Socket.server({ httpServer: server })

webSocket.on('request', (req) => {
  
  const connection = req.accept()
  console.log("Entou")
  // Colocamos cada um dos clientes na tabela.
  clientes.push(connection)
  // Separar cada cliente em uma tabela diferente, para conexões diferentes e simultâneas.

  // Quando outro entrar, enviar a msg de entrou para todos os clientes daquela sala,
  // além de gravar a entrada no banco de dados.

  // Quando sair, também enviar, além de gravar a saída no banco de dados.

  // Quando enviarem mensagem, gravar no banco e também enviar a msg, com o remetente corretamente, para todos os conectados naquela sala.

  // Quando algum cliente logar com a conversa andando, mandar pra ele o histórico de conversas até aquele momento.

  // Quando o emissor encerrar a transmissão, encerrar o bate-papo também.

  // Tratar caso o emissor caia e caso os demais clientes caiam também.

  // Chamar o WebSocket.bufferedAmount e quando atingir um limite próximo do limite, parar de processar aqui no servidor, enviar uma mensagem pro emissor pra ele parar de enviar dados por um tempinho, talvez um segundo já esteja bom, nesse tempo, esvaziar a fila de arquivos que não foram pra rede, ai quando esvaziar, enviar outra msg pro emissor dizendo que pode voltar a mandar coisas. Depois continuar normalmente.

  connection.on('message', async (message) => {

    // Se for mensagem de texto, mensagens mesmo do bate-papo...
    if (message.type === 'utf8') {

      const data = JSON.parse(message.utf8Data)

      if (data.tipo === 'inicia_o_bate_papo') {

        // Criamos uma sala para a transmissão, com um endereço único e salvamos no banco de dados.
        const endereco_da_sala = makeid(3) 
        const obj_mensagem = {
          tipo: 'inicio_da_transmissao',
          id_cliente: data.id_cliente,
          remetente: data.remetente,
          funcao: data.funcao
        }

        const obj_cria_sala = new Sala_de_Transmissao ({
          endereco: endereco_da_sala,
          mensagens: obj_mensagem
        })

        await obj_cria_sala.save()
        console.log("ta iniciando e mandou tudo")
        console.log("endereco_da_sala: " + endereco_da_sala)
        // Voltamos este endereço para o transmissor, para ele poder armazenar em enviar aos outros.
        connection.send(JSON.stringify({tipo: "criou_nova_sala", endereco: endereco_da_sala}))
      }

      if (data.tipo === 'entra_no_bate_papo') {
        console.log("recebeu entra_no_bate_papo")
        const busca_sala = await Sala_de_Transmissao.findOne({endereco: data.endereco_sala})
        
        const obj_nova_mensagem = {
          tipo: 'alguem_entrou',
          id_cliente: data.id_cliente,
          remetente: data.remetente,
          funcao: data.funcao
        }

        busca_sala.mensagens.push(obj_nova_mensagem)
        await busca_sala.save()

        for (var i=0; i<clientes.length; i++) {
          clientes[i].send(JSON.stringify(obj_nova_mensagem))
        }

        console.log("salvou e mandou pros clientesss")
      }

      if (data.tipo === 'msg_normal') {

        // Salva no banco de dados a mensagem, com todos os dados recebidos, normalmente.
        // Busca a sala em questã. Atualiza com a nova mensagem, depois envia a nova mensagem pra quem mandou.
        const busca_sala = await Sala_de_Transmissao.findOne({endereco: data.endereco_sala})
        
        const obj_nova_mensagem = {
          tipo: 'msg_normal_recebida',
          id_cliente: data.id_cliente,
          remetente: data.remetente,
          funcao: data.funcao,
          mensagem: data.mensagem
        }

        busca_sala.mensagens.push(obj_nova_mensagem)
        await busca_sala.save()

        for (let i = 0; i < clientes.length; i++) {
          // Na verdade tem que mandar para todos os conectados nesta sala.
          clientes[i].send(JSON.stringify(obj_nova_mensagem))
        }
       
      }

    }

    // Se for mensagem de vídeo...
    else if (message.type === 'binary') {

      // Se for o primeiro dado binário recebido do cliente emissor.
      if (x == 0) {
        processo_child_ffmpeg = cp.spawn("ffmpeg", ['-re', '-i', '-', '-vcodec', 'libx264', '-profile:v', 'main', '-preset:v', 'medium', '-r', '15', '-g', '30', '-f', 'flv', 'rtmp://192.168.0.176:1935/live/jesus_amor_4'])  

        processo_child_ffmpeg.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`)
        })

        x++
      }
      // console.log(endereco_da_sala)

      console.log(message)
      processo_child_ffmpeg.stdin.write(message.binaryData)
    }
    
  })

  connection.on('close', (reason, description) => {
    // Creio que para ver quem saiu é necessário criar na arraya aqui do servidor junto com a connection de cada um, o id_cliente dos mesmos. Ou unificar os ids, o que seria bem melhor.
    console.log("fechou")
  })
})


app.get('/', (req, res) => {
  res.render('index')
})

// Endereços de salas de transmissões
app.get('/receber/:endereco_sala', async (req, res) => {

  // Busca no banco se tem alguma sala de transmissão com o endereço digitado na barra de endereço do usuário
  const busca_sala = await Sala_de_Transmissao.findOne({endereco: req.params.endereco_sala})

  // Se tem, manda o obj. Se não tem, manda o obj encontrado. Se não tem, manda só uma msg de não encontrado.
  if (busca_sala) {

    res.render('recebe', {tipo: 'sala_encontrada', obj_sala: JSON.stringify(busca_sala)})
  } else {

    res.render('recebe', {tipo: 'sala_nao_encontrada'})
  }
  
})

function makeid(length) {

  var result           = [];
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;

  for ( var i = 0; i < length; i++ ) {
    result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
  }

  return result.join('');
}