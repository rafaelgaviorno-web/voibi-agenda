import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { EMPRESA_LEGAL as E } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Termos de Serviço | Voibi Agenda',
  description: 'Condições de uso do Voibi Agenda.',
};

export default function TermosPage() {
  return (
    <LegalPage titulo="Termos de Serviço">
      <p>
        Estes termos regulam o uso do <strong>{E.produto}</strong> ({E.site}), sistema de agendamento da {E.marca},
        fornecido por <strong>{E.razaoSocial}</strong>, CNPJ {E.cnpj} (&quot;{E.marca}&quot;). Ao usar o sistema, você
        concorda com estes termos e com a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Voibi Agenda permite que empresas organizem as agendas dos seus profissionais, publiquem páginas de agendamento,
        recebam agendamentos por assistentes virtuais e integrações, e, opcionalmente, sincronizem os agendamentos com o
        Google Agenda, com geração de link do Google Meet.
      </p>

      <h2>2. Contas e acesso</h2>
      <ul>
        <li>O acesso ao painel é feito com usuário e senha fornecidos à empresa cliente.</li>
        <li>A empresa é responsável pelos usuários que cadastra, pelas permissões que concede e pela guarda das senhas e chaves de API.</li>
        <li>Qualquer uso indevido ou suspeita de acesso não autorizado deve ser comunicado imediatamente a <a href={`mailto:${E.email}`}>{E.email}</a>.</li>
      </ul>

      <h2>3. Responsabilidades da empresa cliente</h2>
      <ul>
        <li>Usar o sistema de forma lícita e de acordo com estes termos.</li>
        <li>Ter base legal para tratar os dados dos seus clientes e pacientes e informá-los sobre o uso do sistema, como controladora dos dados (LGPD).</li>
        <li>Manter corretos os horários de atendimento, bloqueios e configurações das agendas.</li>
        <li>Não inserir dados de saúde ou dados sensíveis além do necessário para o agendamento.</li>
      </ul>

      <h2>4. Integrações de terceiros</h2>
      <p>
        Integrações como Google Agenda, Google Meet, WhatsApp, CRM e webhooks dependem de serviços de terceiros, sujeitos
        aos termos desses fornecedores. A conexão com o Google é feita pelo próprio profissional e pode ser desfeita a
        qualquer momento. A {E.marca} não se responsabiliza por indisponibilidades, mudanças ou limitações desses serviços.
        Uma falha na sincronização com o Google não impede o registro do agendamento no Voibi Agenda.
      </p>

      <h2>5. Disponibilidade e suporte</h2>
      <p>
        Trabalhamos para manter o serviço disponível de forma contínua, mas podem ocorrer interrupções para manutenção,
        atualizações ou por fatores fora do nosso controle. O suporte é prestado pelo e-mail{' '}
        <a href={`mailto:${E.email}`}>{E.email}</a> e pelos canais definidos em contrato.
      </p>

      <h2>6. Planos e pagamento</h2>
      <p>
        Valores, prazos, forma de pagamento e condições de cancelamento são definidos na proposta ou no contrato firmado
        com a empresa cliente. O atraso no pagamento pode levar à suspensão do acesso após aviso prévio.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        O software, a marca e os materiais do Voibi Agenda pertencem à {E.marca}. A empresa cliente recebe uma licença de
        uso pessoal, intransferível e não exclusiva durante a vigência da contratação. Os dados inseridos pela empresa
        continuam sendo dela.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        A {E.marca} não responde por danos indiretos, lucros cessantes ou perdas decorrentes de uso inadequado do sistema,
        de informações incorretas inseridas pelos usuários ou de falhas de serviços de terceiros. Nos demais casos, a
        responsabilidade fica limitada ao valor pago pela empresa cliente nos 12 meses anteriores ao fato, salvo disposição
        legal em contrário.
      </p>

      <h2>9. Suspensão e encerramento</h2>
      <p>
        A empresa cliente pode encerrar o uso conforme o contrato. A {E.marca} pode suspender contas que violem estes
        termos ou a lei. Após o encerramento, os dados são tratados conforme a Política de Privacidade.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Estes termos podem ser atualizados. A data da última atualização fica no topo da página, e mudanças relevantes
        serão comunicadas aos usuários do painel.
      </p>

      <h2>11. Lei aplicável</h2>
      <p>
        Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da{' '}
        {E.marca} para resolver eventuais controvérsias, salvo quando a lei determinar foro diverso.
      </p>

      <h2>12. Contato</h2>
      <p>
        {E.razaoSocial}, CNPJ {E.cnpj}. E-mail: <a href={`mailto:${E.email}`}>{E.email}</a>.
      </p>
    </LegalPage>
  );
}
