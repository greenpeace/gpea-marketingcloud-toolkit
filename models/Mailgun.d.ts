interface StoredEmailListItem {
  timestamp: number;
  campaigns: any[]; // You can define a more specific type for campaigns
  tags: string[]; // You can define a more specific type for tags
  "log-level": string;
  "user-variables": Record<string, any>; // You can define a more specific type for user variables
  id: string;
  storage: {
    key: string;
    env: string;
    region: string;
    url: string;
  };
  message: {
    headers: {
      to: string;
      "message-id": string;
      subject: string;
      from: string;
    };
    size: number;
    attachments: any[]; // You can define a more specific type for attachments
    recipients: string[];
  };
  event: string;
}

interface Flags {
  "is-test-mode": boolean;
  "is-authenticated": boolean;
}

interface Envelope {
  sender: string;
  targets: string;
  transport: string;
}

interface Paging {
  previous: string; // url
  next: string; // url
  first: string; // url
  last: string; // url
}

interface StoredEmailResponse {
  items: StoredEmailListItem[];
  paging: Paging;
}

interface StoredEmail {
  "Content-Type": string;
  Date: string;
  From: string;
  "List-Help": string;
  "List-Id": string;
  "Message-Id": string;
  "Mime-Version": string;
  Received: string;
  "Reply-To": string;
  Subject: string;
  To: string;
  "X-Csa-Complaints": string;
  "X-Csa-Compliance-Source": string;
  "X-Envelope-From": string;
  "X-Job": string;
  "X-Mailgun-Incoming": string;
  "X-Sfmc-Stack": string;
  sender: string;
  recipients: string;
  from: string;
  subject: string;
  "body-html": string;
  "stripped-signature": string;
}
