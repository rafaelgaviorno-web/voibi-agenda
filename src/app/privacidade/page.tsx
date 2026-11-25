import type { Metadata } from 'next';
import LegalPage, { EMPRESA_LEGAL as E } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Voibi Agenda',
  description: 'Como o Voibi Agenda trata dados pessoais e dados recebidos do Google.',
};

export default function PrivacidadePage() {
  return (
    <LegalPage titulo="Política de Privacidade">
      <p>
        Esta política explica como o <strong>{E.produto}</strong> ({E.site}), sistema de agendamento da {E.marca},
        operado por <strong>{E.razaoSocial}</strong>, CNPJ {E.cnpj}, coleta, usa, armazena e protege dados pessoais,
        em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
      </p>

      <h2>1. Quem usa o Voibi Agenda</h2>
      <p>
        O Voibi Agenda é usado por empresas, como clínicas e consultórios (&quot;clientes&quot;), para organizar as agendas
        dos seus profissionais e receber agendamentos dos seus próprios clientes e pacientes (&quot;clientes finais&quot;).
        Para os dados dos clientes finais, a empresa que usa o sistema é a controladora e a {E.marca} atua como
        operadora, tratando os dados conforme as instruções dessa empresa. Para os dados de cadastro dos usuários do
        painel, a {E.marca} é a controladora.
      </p>

      <h2>2. Dados que tratamos</h2>
      <ul>
        <li><strong>Usuários do painel:</strong> nome, e-mail, empresa e permissões de acesso.</li>
        <li><strong>Agendas:</strong> nome do profissional, foto (opcional), horários de atendimento e bloqueios.</li>
        <li><strong>Clientes finais:</strong> nome, telefone/WhatsApp, e-mail (opcional), data e horário do agendamento, tipo de atendimento e observações informadas no agendamento.</li>
        <li><strong>Registros técnicos:</strong> data e hora das requisições, endereço IP e informações do navegador, usados para segurança e diagnóstico.</li>
        <li><strong>Dados do Google</strong>, somente quando um profissional conecta a sua conta Google (ver seção 3).</li>
      </ul>

      <h2>3. Dados de usuário do Google</h2>
      <p>
        A integração com o Google é opcional. Ela só é ativada quando um profissional, na tela de configuração da sua
        agenda no Voibi Agenda, clica em &quot;Conectar Google Agenda&quot; e autoriza o acesso na tela de consentimento do
        Google. Esta seção descreve exatamente quais dados do Google acessamos e o que fazemos com eles.
      </p>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.1 Quais dados do Google acessamos</h3>
      <ul>
        <li><strong>Endereço de e-mail da conta Google</strong> (escopos openid e email): para mostrar ao profissional qual conta está conectada.</li>
        <li><strong>Eventos do Google Agenda criados pelo Voibi Agenda</strong> (escopo calendar.events): criamos, alteramos e excluímos apenas os eventos que correspondem a agendamentos feitos no Voibi Agenda. Não listamos, lemos nem alteramos outros eventos do calendário.</li>
        <li><strong>Informação de livre/ocupado</strong> (escopo calendar.freebusy): apenas os intervalos de início e fim em que o profissional está ocupado. Essa informação não inclui título, descrição, local, participantes ou qualquer outro conteúdo dos eventos.</li>
      </ul>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.2 Como usamos esses dados</h3>
      <ul>
        <li>Quando um agendamento é criado no Voibi Agenda (pela página de agendamento, pelo painel ou pelo assistente virtual da clínica), criamos um evento no Google Agenda do profissional, com data, horário, nome e contato do cliente, observações do agendamento e um link do Google Meet para o atendimento online.</li>
        <li>Quando o agendamento é remarcado ou cancelado, atualizamos ou excluímos esse mesmo evento.</li>
        <li>Ao calcular os horários livres para novos agendamentos, consultamos os intervalos ocupados para não oferecer horários em que o profissional já tem compromisso.</li>
        <li>O link do Google Meet é enviado ao cliente do agendamento (por exemplo, na confirmação pelo WhatsApp) para que ele possa entrar na reunião.</li>
      </ul>
      <p>Os dados do Google não são usados para nenhuma outra finalidade.</p>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.3 Como armazenamos e protegemos</h3>
      <ul>
        <li>Guardamos o e-mail da conta conectada, o token de autorização fornecido pelo Google e, para cada agendamento, o identificador do evento criado e o link do Google Meet.</li>
        <li>O token fica em banco de dados com acesso restrito ao servidor da aplicação, nunca é enviado ao navegador e trafega somente por conexões criptografadas (HTTPS).</li>
        <li>Os intervalos de livre/ocupado são consultados no momento do cálculo de horários e não são armazenados.</li>
      </ul>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.4 Compartilhamento</h3>
      <p>
        Não vendemos, não alugamos e não compartilhamos dados de usuário do Google com terceiros. Eles não são usados para
        publicidade, para criar perfis de usuários nem para treinar ou melhorar modelos de inteligência artificial.
        Pessoas da nossa equipe não leem esses dados, exceto com autorização do usuário, quando necessário por segurança
        ou para cumprir a lei. O único dado do Google que sai do sistema é o link do Google Meet, enviado ao cliente do
        próprio agendamento.
      </p>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.5 Retenção e exclusão</h3>
      <ul>
        <li>O profissional pode desconectar a conta Google a qualquer momento, na aba &quot;Google Agenda&quot; da configuração da agenda. Ao desconectar, revogamos a autorização junto ao Google e apagamos o token imediatamente.</li>
        <li>O acesso também pode ser removido em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.</li>
        <li>Os identificadores de evento e links do Meet ficam junto dos agendamentos enquanto a clínica usar o serviço e são excluídos com eles.</li>
        <li>Para pedir a exclusão de qualquer dado, escreva para <a href={`mailto:${E.email}`}>{E.email}</a>. Atendemos em até 15 dias.</li>
        <li>Os eventos criados no Google Agenda pertencem ao profissional e permanecem no calendário dele até que ele os exclua.</li>
      </ul>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.6 Política de Dados do Usuário dos Serviços de API do Google</h3>
      <p>
        O uso e a transferência, pelo Voibi Agenda, de informações recebidas das APIs do Google para qualquer outro app
        seguirão a{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Política de Dados do Usuário dos Serviços de API do Google
        </a>, incluindo os requisitos de Uso Limitado.
      </p>

      <h3 className="font-semibold text-zinc-900 dark:text-white mt-6">3.7 Google user data (English summary)</h3>
      <p>
        Voibi Agenda accesses Google user data only after a professional connects their Google account. We access: the
        account email address (to show which account is connected); Google Calendar events created by Voibi Agenda (to
        create, update and delete one event per appointment booked in Voibi Agenda, with a Google Meet link); and
        free/busy time ranges (to avoid offering times when the professional is busy). We do not read other calendar
        events. We store only the account email, the OAuth token (server-side, never sent to the browser), and the event
        ID and Meet link of each appointment. We do not sell, share or transfer Google user data to third parties, and we
        do not use it for advertising or to train AI models. Users can disconnect at any time, which revokes the token and
        deletes it; deletion requests: {E.email}. Voibi Agenda&apos;s use and transfer of information received from Google
        APIs to any other app will adhere to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Google API Services User Data Policy
        </a>, including the Limited Use requirements.
      </p>

      <h2>4. Para que usamos os dados</h2>
      <ul>
        <li>Prestar o serviço de agendamento: mostrar horários livres, registrar, remarcar e cancelar agendamentos.</li>
        <li>Enviar avisos e lembretes de agendamento pelos canais configurados pela empresa (por exemplo, WhatsApp).</li>
        <li>Integrar com sistemas indicados pela empresa, como assistentes virtuais, CRM e webhooks.</li>
        <li>Garantir a segurança, prevenir fraudes e corrigir falhas.</li>
        <li>Cumprir obrigações legais.</li>
      </ul>
      <p>
        As bases legais são a execução de contrato, o legítimo interesse, o cumprimento de obrigação legal e, quando
        aplicável, o consentimento do titular (LGPD, art. 7º).
      </p>

      <h2>5. Compartilhamento</h2>
      <p>Os dados podem ser compartilhados apenas com:</p>
      <ul>
        <li>fornecedores de infraestrutura que hospedam o sistema e o banco de dados, sob dever de confidencialidade;</li>
        <li>o Google, quando o profissional ativa a integração com o Google Agenda;</li>
        <li>sistemas configurados pela própria empresa cliente (webhooks, CRM, WhatsApp);</li>
        <li>autoridades públicas, quando exigido por lei ou ordem judicial.</li>
      </ul>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados enquanto a empresa cliente utilizar o serviço. Após o encerramento, os dados podem ser
        excluídos ou devolvidos a pedido da empresa, ressalvadas as informações que precisemos guardar por obrigação legal.
        Os dados do Google são apagados quando a conta é desconectada.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), controle de acesso por usuário e empresa, chaves de API por empresa e
        restrição de acesso ao banco de dados. Nenhum sistema é totalmente imune a incidentes; se ocorrer algum que possa
        trazer risco relevante, comunicaremos os afetados e a ANPD nos termos da lei.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Usamos apenas o cookie necessário para manter o usuário conectado ao painel. Não usamos cookies de publicidade.
      </p>

      <h2>9. Seus direitos</h2>
      <p>
        O titular pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, eliminação,
        informação sobre compartilhamento e revogação do consentimento (LGPD, art. 18). Se você é cliente final de uma
        empresa que usa o Voibi Agenda, o pedido pode ser feito diretamente a essa empresa ou a nós, e encaminharemos.
        Contato: <a href={`mailto:${E.email}`}>{E.email}</a>.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Esta política pode ser atualizada. A data da última atualização fica no topo da página, e mudanças relevantes
        serão comunicadas aos usuários do painel.
      </p>

      <h2>11. Contato</h2>
      <p>
        {E.razaoSocial}, CNPJ {E.cnpj}. E-mail: <a href={`mailto:${E.email}`}>{E.email}</a>.
      </p>
    </LegalPage>
  );
}
