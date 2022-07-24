const webSocket = new WebSocket("wss://maisumservidor.ddnsking.com:3011")

// Essa var javascript endereco_sala_emissor é utilizada pelo emissor e pelos receptores.
// O emissor recebe este valor do servidor quando ele cria a sala.
// O receptor recebe quando acessa o endereço correto da sala.
var endereco_sala_emissor

// A var id_cliente também é utilizada pelo emissor e pelos receptores
// As duas são fabricadas aqui no lado do cliente.
// O emissor cria ela na função inicia_transmissao()
// Já o receptor cria ela na função prepara_assistir()
var id_cliente

var clientes_conectados = []
webSocket.onconnect = (event) => {
  console.log("conetou")
}

webSocket.onmessage = (event) => {
  const data_chegou = JSON.parse(event.data)

  // Só quem recebe esse msg de baixo é o emissor, assim que a sala é criada.
  if (data_chegou.tipo === 'criou_nova_sala') {
    endereco_sala_emissor = data_chegou.endereco

    let recip_msgs = document.getElementById('recip_msgs')
    recip_msgs.innerHTML = `
	  	<!-- recip msgs, largura 100%, fundo transparente -->
			<div class="flex_col T1" style="align-items: center;">
				<!-- a parte com o fundinho branco -->
				<div style="max-width: 100%; background: var(--azul); color: white; border-radius: 10px; padding: 10px; margin-top: 10px;">
					<!-- Nome do cidadão -->
					<div style="margin-bottom: 5px;"><b>Transmissão abierta</b></div>
				</div>
			</div>
		`
  }

  // Só se mostra a própria mensagem depois dela ser gravada no banco de dados
  // Até mesmo o próprio remetente só mostra ela quando recebe de volta do servidor.
  if (data_chegou.tipo === 'msg_normal_recebida') {

    if (data_chegou.id_cliente === id_cliente) {
      // Própria mensagem.

      let recip_msgs = document.getElementById('recip_msgs')
      recip_msgs.innerHTML = recip_msgs.innerHTML + `
	  		<!-- recip msgs, largura 100%, fundo transparente -->
	      <div class="flex_col T1" style="align-items: flex-end;">
	        <!-- a parte com o fundinho branco -->
	        <div style="max-width: 75%; background: var(--verde_clarinho); border-radius: 10px; padding: 10px; margin-top: 10px;">
	          <!-- Nome do cidadão -->
	          <div style="font-weight: bold; color: red; margin-bottom: 5px;">${data_chegou.remetente}</div>
	          <!-- Msg do cidadão -->
	          ${data_chegou.mensagem}
	        </div>
	      </div>
	  	`
    } else {
      // Mensagem de terceiros.

      let recip_msgs = document.getElementById('recip_msgs')
      recip_msgs.innerHTML = recip_msgs.innerHTML + `
	  		<!-- recip msgs, largura 100%, fundo transparente -->
	      <div class="flex_col T1" style="align-items: flex-start;">
	        <!-- a parte com o fundinho branco -->
	        <div style="max-width: 75%; background: white; border-radius: 10px; padding: 10px; margin-top: 10px;">
	          <!-- Nome do cidadão -->
	          <div style="font-weight: bold; color: green; margin-bottom: 5px;">${data_chegou.remetente}</div>
	          <!-- Msg do cidadão -->
	          ${data_chegou.mensagem}
	        </div>
	      </div>
	  	`
    }
  }

  if (data_chegou.tipo === 'alguem_entrou') {

    let recip_msgs = document.getElementById('recip_msgs')
    recip_msgs.innerHTML = recip_msgs.innerHTML + `
	  	<!-- recip msgs, largura 100%, fundo transparente -->
      <div class="flex_col T1" style="align-items: center;">
        <!-- a parte com o fundinho branco -->
        <div style="max-width: 75%;  background: var(--azul); border-radius: 10px; padding: 10px; margin-top: 10px;">
          <!-- Nome do cidadão -->
          <div style="margin-bottom: 5px; color: white;"><b>${data_chegou.remetente}</b> acabou de entrar</div>
              
        </div>
      </div>
	  	`
  }

  if (data_chegou.tipo === 'alguem_saiu') {

  }

  if (data_chegou.tipo === 'bate_papo_encerrado') {

  }

  // Rola a div recipiente das mensagens para baixo a cada nova mensagem chegada.
  recip_msgs.scrollTop = recip_msgs.scrollHeight
}

function enviar_msg(funcao_remetente) {

  let obj_msg
  if (funcao_remetente === 'emissor') {

    obj_msg = {
      tipo: 'msg_normal',
      endereco_sala: endereco_sala_emissor,
      id_cliente: id_cliente,
      remetente: document.getElementById('nome_transmissor').value,
      funcao: 'emissor',
      mensagem: document.getElementById('input_msg').value
    }
  }

  if (funcao_remetente === 'receptor') {

    obj_msg = {
      tipo: 'msg_normal',
      endereco_sala: endereco_sala_emissor,
      id_cliente: id_cliente,
      remetente: document.getElementById('nome_receptor').value,
      funcao: 'receptor',
      mensagem: document.getElementById('input_msg').value
    }
  }

  document.getElementById('input_msg').value = ''
  webSocket.send(JSON.stringify(obj_msg))
}

/* Funções Operacionais das páginas */
function copia_end_transmissao() {

  // Se o botao de copiar link estiver ativado
  if (document.getElementById('bot_copiar_link').classList.contains('bot_ativado')) {
    console.log("Link copiado")

    const link_completo_sala = `https://maisumservidor.ddnsking.com/receber/${endereco_sala_emissor}`

    navigator.clipboard.writeText(link_completo_sala).then(function() {
      /* clipboard successfully set */
    }, function() {
      /* clipboard write failed */
    })

  }
}

function prepara_transmissao() {
  document.getElementById('recip_bota_nome_emissor').style.display = 'flex'
}
function fecha_bota_nome_emissor() {
  document.getElementById('recip_bota_nome_emissor').style.display = 'none'
}

function verifica_campo_nome(funcao) {
  if (funcao === 'emissor') {
    if (document.getElementById('nome_transmissor').value == '') {
      ativa_elementos({ id_elm: 'bot_inicia_transmissao', acao: 'desativar' })
    }

    if (document.getElementById('nome_transmissor').value != '') {
      ativa_elementos({ id_elm: 'bot_inicia_transmissao', acao: 'ativar' })
    }
  }

  if (funcao === 'receptor') {
    if (document.getElementById('nome_receptor').value == '') {
      ativa_elementos({ id_elm: 'bot_inicia_assistir', acao: 'desativar' })
    }

    if (document.getElementById('nome_receptor').value != '') {
      ativa_elementos({ id_elm: 'bot_inicia_assistir', acao: 'ativar' })
    }
  }
}


// Finalmente a função que inicia a transmissão de vídeo.
function inicia_transmissao() {
  // Primeiro prepara tudo.
  const bot_inicia_transmissao = document.getElementById('bot_inicia_transmissao')

  if (bot_inicia_transmissao.classList.contains('bot_ativado')) {

    // Troca nome das boas vindas
    let nome = document.getElementById('nome_transmissor').value
    document.getElementById('div_ola_transmissor').innerHTML = `Olá <strong>${nome}</strong>`
    fecha_bota_nome_emissor()

    // Botões
    ativa_elementos({ id_elm: 'bot_enviar_msg', acao: 'ativar' })
    ativa_elementos({ id_elm: 'bot_copiar_link', acao: 'ativar' })

    // Demais elementos
    ativa_elementos({ id_elm: 'fundo_bate_papo', acao: 'ativar' })
    ativa_elementos({ id_elm: 'input_msg', acao: 'ativar' })
    ativa_elementos({ id_elm: 'fundo_bate_papo', acao: 'ativar' })

    id_cliente = makeid(20)

    // Depois chama a função principal que inicia a parada.
    liga_cam_2()
  }

}


function prepara_assistir() {

  const bot_inicia_transmissao = document.getElementById('bot_inicia_assistir')

  if (bot_inicia_transmissao.classList.contains('bot_ativado')) {

    let nome = document.getElementById('nome_receptor').value
    document.getElementById('div_ola_receptor').innerHTML = `Olá <strong>${nome}</strong>`
    document.getElementById('recip_apresentacao').style.display = 'none'

    id_cliente = makeid(20)

    // Envia mensagem para o servidor, dizendo que este recebedor acabou de entrar.
    let obj_vai = {
      tipo: 'entra_no_bate_papo',
      endereco_sala: endereco_sala_emissor,
      id_cliente: id_cliente,
      remetente: document.getElementById('nome_receptor').value,
      funcao: 'receptor'
    }
    webSocket.send(JSON.stringify(obj_vai))

    funcao_vai()
  }
}

function ativa_elementos({ id_elm, acao }) {
  let elemento = document.getElementById(id_elm)

  if (acao === 'ativar') {

    if (id_elm === 'fundo_bate_papo') { elemento.style.backgroundColor = '#f2edc9' }
    if (id_elm === 'input_msg') { elemento.disabled = false }

    if (elemento.classList.contains('bot_desativado')) {
      elemento.classList.remove('bot_desativado')
      elemento.classList.add('bot_ativado')
    }
  }

  if (acao === 'desativar') {

    if (id_elm === 'fundo_bate_papo') { elemento.style.backgroundColor = 'grey' }
    if (id_elm === 'input_msg') { elemento.disabled = true }

    if (elemento.classList.contains('bot_ativado')) {
      elemento.classList.remove('bot_ativado')
      elemento.classList.add('bot_desativado')
    }
  }
}

function makeid(length) {
  var result = [];
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() *
      charactersLength)));
  }
  return result.join('');
}

var wholeVideo = []
var chunks = []
var mediaRecorder

async function liga_cam_2() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(gotMedia)
    .catch(e => { console.error('getUserMedia() failed: ' + e); });
}

function gotMedia(stream) {

  document.getElementById('video_para_canvas').srcObject = stream
  var options = { mimeType: "video/webm; codecs=vp9" }

  mediaRecorder = new MediaRecorder(stream, options)
  mediaRecorder.stream = stream

  mediaRecorder.mimeType = 'video/webm'
  mediaRecorder.start(20)

  // Inicía o bate-papo
  let obj_vai = {
    tipo: 'inicia_o_bate_papo',
    id_cliente: id_cliente,
    remetente: document.getElementById('nome_transmissor').value,
    funcao: 'emissor',
    mensagem: 'inicia_o_bate_papo'
  }
  webSocket.send(JSON.stringify(obj_vai))

  // Quando o pedaço do vídeo estiver pronto
  mediaRecorder.ondataavailable = (event) => {

    chunks.push(event.data)
    // wholeVideo.push(event.data)
    sendData()
  }
}

function sendData() {

  const superBuffer = new Blob(chunks, { 'type': 'video/webm' })
  let quantia_buffer = webSocket.bufferedAmount

  /*
  if (quantia_buffer < 100000) {
  	webSocket.send(superBuffer)
  }
  */

  webSocket.send(superBuffer)
  chunks = []
  // console.table(superBuffer)
}