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

      <h2>3. Dados recebidos do Google (Google Agenda e Google Meet)</h2>
      <p>
        A integração com o Google é opcional e ativada pelo próprio profissional, na tela de configuração da sua agenda.
        Ao conectar, ele autoriza o Voibi Agenda a acessar a sua conta Google com as seguintes permissões:
      </p>
      <ul>
        <li><strong>Eventos do Google Agenda</strong> (calendar.events): para criar, atualizar e excluir, no calendário do profissional, os eventos correspondentes aos agendamentos feitos no Voibi Agenda, com link do Google Meet.</li>
        <li><strong>Disponibilidade</strong> (calendar.freebusy): para consultar apenas os períodos em que o profissional está ocupado, de modo que esses horários não sejam oferecidos para novos agendamentos. Essa consulta não acessa títulos, descrições, participantes ou qualquer outro conteúdo dos eventos.</li>
        <li><strong>Endereço de e-mail</strong> (openid e email): para mostrar no painel qual conta Google está conectada.</li>
      </ul>
      <p>Guardamos somente o necessário para a integração funcionar:</p>
      <ul>
        <li>o e-mail da conta conectada;</li>
        <li>o token de autorização fornecido pelo Google, armazenado em servidor, em tabela de acesso restrito e nunca enviado ao navegador;</li>
        <li>para cada agendamento, o identificador do evento criado no Google e o link do Google Meet.</li>
      </ul>
      <p>
        Não lemos, copiamos nem armazenamos o conteúdo de outros eventos do calendário do profissional. Os dados recebidos
        do Google <strong>não são vendidos, não são usados para publicidade, não são usados para treinar modelos de
        inteligência artificial</strong> e não são compartilhados com terceiros, exceto quando necessário para prestar a
        funcionalidade solicitada, para cumprir a lei ou mediante consentimento expresso do usuário.
      </p>
      <p>
        O uso e a transferência, pelo Voibi Agenda, de informações recebidas das APIs do Google seguem a{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Política de Dados do Usuário dos Serviços de API do Google
        </a>, incluindo os requisitos de Uso Limitado.
      </p>
      <p>
        O profissional pode desconectar a conta Google a qualquer momento na aba &quot;Google Agenda&quot; da configuração da
        agenda. Ao desconectar, revogamos a autorização junto ao Google e apagamos o token armazenado. O acesso também pode
        ser removido diretamente em{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
        Os eventos já criados permanecem no calendário do profissional, que pode excluí-los quando quiser.
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
