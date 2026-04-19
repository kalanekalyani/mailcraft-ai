// api/chat.js — Smart Email Generator (No API Key Required)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { system = '', messages = [] } = req.body;
  const userMessage = messages[0]?.content || '';
  const fullPrompt = system + '\n\n' + userMessage;

  const senderMatch = fullPrompt.match(/Sender:\s*(.+)/);
  const recipientMatch = fullPrompt.match(/Recipient:\s*(.+)/);
  const toneMatch = fullPrompt.match(/^Write a (\w+)/);
  const sender = senderMatch?.[1]?.trim() || 'Sender';
  const recipient = recipientMatch?.[1]?.trim() || 'Recipient';
  const tone = toneMatch?.[1] || 'professional';

  function getClosing(t) {
    const c = { formal:'Yours faithfully', polite:'Warm regards', friendly:'Cheers', professional:'Best regards', casual:'Thanks', empathetic:'With warmth', brief:'Regards' };
    return (c[t] || 'Best regards') + ',\n' + sender;
  }

  let text = '';

  if (fullPrompt.includes('Summarize')) {
    const emailText = fullPrompt.split('Summarize:')[1] || '';
    const lines = emailText.trim().split('\n').filter(l => l.trim()).slice(0, 6);
    if (fullPrompt.includes('bullets')) {
      text = 'Key points from the email:\n\n' + lines.map(l => '• ' + l.trim()).join('\n');
    } else if (fullPrompt.includes('detailed')) {
      text = 'Detailed Summary:\n\n' + lines.join('\n') + '\n\nThe email covers the above points and may require your attention or response.';
    } else {
      text = 'Summary: ' + lines.slice(0,2).join(' ').substring(0, 200) + (lines.length > 2 ? '...' : '');
    }

  } else if (fullPrompt.includes('Improve this email') || fullPrompt.includes('Make the email')) {
    const original = fullPrompt.split(/Improve this email:|email:\n\n/)[1] || userMessage;
    const cleaned = original.trim()
      .replace(/\bi\b/g, 'I').replace(/cant/gi, "can't")
      .replace(/dont/gi, "don't").replace(/wont/gi, "won't")
      .replace(/  +/g, ' ');
    text = cleaned + '\n\n[Grammar and clarity improved]';

  } else if (fullPrompt.includes('Convert') && fullPrompt.includes('tone')) {
    const toTone = fullPrompt.match(/to a (\w+) tone/)?.[1] || 'professional';
    const emailBody = fullPrompt.split('\n\n').slice(-1)[0] || '';
    text = `Dear ${recipient},\n\n` + emailBody.replace(/^Dear.*,\n/, '').replace(/^Hi.*,\n/, '') + `\n\n${getClosing(toTone)}`;

  } else if (fullPrompt.includes('reply') || fullPrompt.includes('Reply') || fullPrompt.includes('Smart Reply')) {
    const intent = fullPrompt.match(/My intent:\s*(.+)/)?.[1] || 'Reply appropriately';
    text = `Dear ${recipient},\n\nThank you for your email. I have carefully reviewed your message regarding the matter you raised.\n\n${intent.includes('Accept') ? 'I am pleased to confirm my acceptance and look forward to proceeding.' : intent.includes('Decline') ? 'After careful consideration, I regret to inform you that I am unable to proceed at this time. I appreciate your understanding.' : intent.includes('clarif') ? 'Could you please provide additional details so I can better assist you with this matter?' : 'I will look into this and get back to you at the earliest with a comprehensive response.'}\n\nPlease feel free to reach out if you need any further information.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('variation')) {
    const emailSnippet = userMessage.replace('Generate 2 variations of this email:', '').trim().substring(0, 300);
    text = `Version A:\nSubject: Re: Your Email\n\nDear ${recipient},\n\n${emailSnippet.substring(0, 150)}\n\nLooking forward to your response.\n\n${getClosing('professional')}\n\n---\n\nVersion B:\nSubject: Following Up\n\nHi ${recipient},\n\n${emailSnippet.substring(0, 150)}\n\nDo let me know if you need anything further.\n\nThanks,\n${sender}`;

  } else if (fullPrompt.includes('job_application') || fullPrompt.includes('Job Application') || fullPrompt.includes('resume') || fullPrompt.includes('cover_letter')) {
    const role = fullPrompt.match(/Position Applying For:\s*(.+)/)?.[1] || 'the advertised position';
    const company = fullPrompt.match(/Company Name:\s*(.+)/)?.[1] || 'your organization';
    const exp = fullPrompt.match(/Years of Experience:\s*(.+)/)?.[1] || '';
    const skills = fullPrompt.match(/Key Skills:\s*(.+)/)?.[1] || '';
    text = `Subject: Application for ${role} — ${sender}\n\nDear ${recipient},\n\nI am writing to express my strong interest in the ${role} position at ${company}.${exp ? ' With ' + exp + ' of hands-on experience' : ''}${skills ? ' and expertise in ' + skills + ',' : ','} I am confident in my ability to contribute meaningfully to your team.\n\nI have attached my resume for your consideration and would welcome the opportunity to discuss how my background aligns with your requirements. I look forward to the possibility of joining ${company}.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('sick_leave') || fullPrompt.includes('Sick Leave')) {
    const from = fullPrompt.match(/Sick Leave From:\s*(.+)/)?.[1] || 'today';
    const to = fullPrompt.match(/Expected Return:\s*(.+)/)?.[1] || 'shortly';
    const reason = fullPrompt.match(/Brief Medical Reason:\s*(.+)/)?.[1] || 'feeling unwell';
    text = `Subject: Sick Leave Application — ${sender}\n\nDear ${recipient},\n\nI am writing to inform you that I am ${reason} and am unable to attend work from ${from}. I expect to resume by ${to}.\n\nI apologize for any inconvenience caused and will ensure all pending work is handled upon my return. Please let me know if any urgent matters need attention during my absence.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('leave_application') || fullPrompt.includes('Leave Application')) {
    const from = fullPrompt.match(/Leave From Date:\s*(.+)/)?.[1] || '';
    const to = fullPrompt.match(/Leave To Date:\s*(.+)/)?.[1] || '';
    const reason = fullPrompt.match(/Reason for Leave:\s*(.+)/)?.[1] || 'personal reasons';
    text = `Subject: Leave Application — ${sender}\n\nDear ${recipient},\n\nI would like to request leave${from ? ' from ' + from : ''}${to ? ' to ' + to : ''} due to ${reason}.\n\nI will ensure all responsibilities are up to date before my leave and remain reachable for urgent matters. I kindly request your approval at the earliest.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('meeting_invitation') || fullPrompt.includes('Meeting')) {
    const date = fullPrompt.match(/Meeting Date:\s*(.+)/)?.[1] || 'the scheduled date';
    const time = fullPrompt.match(/Meeting Time:\s*(.+)/)?.[1] || 'the scheduled time';
    const agenda = fullPrompt.match(/Agenda:\s*(.+)/)?.[1] || 'important matters';
    text = `Subject: Meeting Invitation — ${agenda}\n\nDear ${recipient},\n\nYou are cordially invited to a meeting on ${date} at ${time}.\n\nAgenda: ${agenda}\n\nPlease confirm your availability at the earliest. Your presence and input would be greatly valued.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('resignation') || fullPrompt.includes('Resignation')) {
    const lastDay = fullPrompt.match(/Last Working Day:\s*(.+)/)?.[1] || 'the agreed date';
    text = `Subject: Resignation Letter — ${sender}\n\nDear ${recipient},\n\nI am writing to formally tender my resignation, effective ${lastDay}.\n\nThis was not an easy decision. I am deeply grateful for the opportunities and experiences I have gained during my time here. I will ensure a smooth handover of all responsibilities.\n\nThank you for everything.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('thank_you') || fullPrompt.includes('Thank You')) {
    text = `Subject: Thank You — ${sender}\n\nDear ${recipient},\n\nI wanted to take a moment to sincerely thank you for your support and kindness. Your help truly made a difference and I deeply appreciate everything you have done.\n\nThank you once again — it means more than words can convey.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('complaint') || fullPrompt.includes('Complaint')) {
    text = `Subject: Complaint — ${sender}\n\nDear ${recipient},\n\nI am writing to formally bring a matter to your attention that has caused me significant concern and inconvenience.\n\nI trust that you will look into this seriously and take the necessary steps to resolve it promptly. I look forward to a swift response.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('apology') || fullPrompt.includes('Apology')) {
    text = `Subject: Sincere Apology — ${sender}\n\nDear ${recipient},\n\nI am sincerely sorry for my actions and the inconvenience caused. I take full responsibility and am committed to ensuring this does not happen again.\n\nI value our relationship greatly and hope to make things right.\n\n${getClosing(tone)}`;

  } else if (fullPrompt.includes('birthday') || fullPrompt.includes('Birthday')) {
    text = `Subject: Happy Birthday!\n\nDear ${recipient},\n\nWishing you a very Happy Birthday! 🎂\n\nHope this special day brings you endless joy and all the happiness you deserve. Here's to a wonderful year ahead!\n\nWith warm wishes,\n${sender}`;

  } else if (fullPrompt.includes('congratulations') || fullPrompt.includes('Congratulations')) {
    text = `Subject: Congratulations! — ${sender}\n\nDear ${recipient},\n\nWarm congratulations on your achievement! This is truly a well-deserved recognition of your hard work and dedication.\n\nWishing you continued success in everything you do!\n\nWith warm regards,\n${sender}`;

  } else {
    const typeMatch = fullPrompt.match(/Write a \w+ (.+?) email/);
    const emailType = typeMatch?.[1] || 'message';
    text = `Subject: ${emailType} — ${sender}\n\nDear ${recipient},\n\nI am reaching out regarding an important matter that requires your attention.\n\nI would appreciate your prompt response and look forward to resolving this together.\n\n${getClosing(tone)}`;
  }

  return res.status(200).json({ content: [{ type: 'text', text }] });
}
