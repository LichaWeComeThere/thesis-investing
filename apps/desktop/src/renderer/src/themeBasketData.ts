import type { ThemeBasket } from '@thesis-investing/core';

export const STATIC_THEME_BASKETS: ThemeBasket[] = [
  {
    id: 'theme_ai_infrastructure',
    name: 'AI Infrastructure',
    description:
      'Companies that may sit around the compute, networking, and platform layers used to build AI systems.',
    educationalRationale:
      'This basket groups examples users may research when learning how AI workloads rely on chips, cloud capacity, and infrastructure software.',
    examples: [
      {
        ticker: 'NVDA',
        companyName: 'NVIDIA',
        note: 'Example semiconductor and accelerator infrastructure company.'
      },
      {
        ticker: 'MSFT',
        companyName: 'Microsoft',
        note: 'Example cloud platform and productivity software company.'
      },
      {
        ticker: 'AVGO',
        companyName: 'Broadcom',
        note: 'Example networking and custom silicon company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['AI', 'Infrastructure', 'Cloud', 'Semiconductors'],
    tickers: ['NVDA', 'MSFT', 'AVGO']
  },
  {
    id: 'theme_cybersecurity',
    name: 'Cybersecurity',
    description:
      'Companies that provide security software, identity, network defense, and threat monitoring tools.',
    educationalRationale:
      'This basket helps users organize research around how businesses defend systems, endpoints, cloud workloads, and identities.',
    examples: [
      {
        ticker: 'CRWD',
        companyName: 'CrowdStrike',
        note: 'Example endpoint and cloud security company.'
      },
      {
        ticker: 'PANW',
        companyName: 'Palo Alto Networks',
        note: 'Example network and cloud security company.'
      },
      {
        ticker: 'FTNT',
        companyName: 'Fortinet',
        note: 'Example network security and firewall company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Security', 'Software', 'Infrastructure'],
    tickers: ['CRWD', 'PANW', 'FTNT']
  },
  {
    id: 'theme_cloud_software',
    name: 'Cloud Software',
    description:
      'Companies tied to cloud platforms, software subscriptions, data tools, and developer workflows.',
    educationalRationale:
      'This basket gives users a place to compare different business models within cloud-based software and platform ecosystems.',
    examples: [
      {
        ticker: 'CRM',
        companyName: 'Salesforce',
        note: 'Example customer relationship management software company.'
      },
      {
        ticker: 'NOW',
        companyName: 'ServiceNow',
        note: 'Example workflow automation software company.'
      },
      {
        ticker: 'SNOW',
        companyName: 'Snowflake',
        note: 'Example cloud data platform company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Software', 'Cloud', 'Subscriptions'],
    tickers: ['CRM', 'NOW', 'SNOW']
  },
  {
    id: 'theme_digital_payments',
    name: 'Digital Payments',
    description:
      'Companies involved in card networks, payment processors, merchant tools, and digital transaction infrastructure.',
    educationalRationale:
      'This basket supports research into transaction volume, payment acceptance, merchant services, and financial technology infrastructure.',
    examples: [
      {
        ticker: 'V',
        companyName: 'Visa',
        note: 'Example global payments network company.'
      },
      {
        ticker: 'MA',
        companyName: 'Mastercard',
        note: 'Example global payments network company.'
      },
      {
        ticker: 'PYPL',
        companyName: 'PayPal',
        note: 'Example digital wallet and payment services company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Payments', 'Fintech', 'Networks'],
    tickers: ['V', 'MA', 'PYPL']
  },
  {
    id: 'theme_semiconductors',
    name: 'Semiconductors',
    description:
      'Companies across chip design, manufacturing, equipment, memory, and semiconductor supply chains.',
    educationalRationale:
      'This basket helps users study how different companies participate in the semiconductor value chain.',
    examples: [
      {
        ticker: 'TSM',
        companyName: 'Taiwan Semiconductor Manufacturing',
        note: 'Example semiconductor foundry company.'
      },
      {
        ticker: 'ASML',
        companyName: 'ASML',
        note: 'Example semiconductor equipment company.'
      },
      {
        ticker: 'AMD',
        companyName: 'Advanced Micro Devices',
        note: 'Example chip design company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Semiconductors', 'Hardware', 'Supply Chain'],
    tickers: ['TSM', 'ASML', 'AMD']
  },
  {
    id: 'theme_healthcare_innovation',
    name: 'Healthcare Innovation',
    description:
      'Companies connected to medical devices, diagnostics, biotechnology, and healthcare technology.',
    educationalRationale:
      'This basket groups examples users may research when learning how innovation changes care delivery, diagnostics, and therapies.',
    examples: [
      {
        ticker: 'ISRG',
        companyName: 'Intuitive Surgical',
        note: 'Example robotic surgery company.'
      },
      {
        ticker: 'TMO',
        companyName: 'Thermo Fisher Scientific',
        note: 'Example life sciences tools company.'
      },
      {
        ticker: 'DXCM',
        companyName: 'DexCom',
        note: 'Example medical device and glucose monitoring company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Healthcare', 'Innovation', 'Devices'],
    tickers: ['ISRG', 'TMO', 'DXCM']
  },
  {
    id: 'theme_energy_transition',
    name: 'Energy Transition',
    description:
      'Companies connected to electrification, renewable energy, grid infrastructure, and efficiency tools.',
    educationalRationale:
      'This basket helps users organize research around changing energy systems and the infrastructure needed to support them.',
    examples: [
      {
        ticker: 'NEE',
        companyName: 'NextEra Energy',
        note: 'Example utility and renewable energy company.'
      },
      {
        ticker: 'ENPH',
        companyName: 'Enphase Energy',
        note: 'Example solar and energy technology company.'
      },
      {
        ticker: 'TSLA',
        companyName: 'Tesla',
        note: 'Example electric vehicle and energy storage company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Energy', 'Electrification', 'Infrastructure'],
    tickers: ['NEE', 'ENPH', 'TSLA']
  },
  {
    id: 'theme_consumer_platforms',
    name: 'Consumer Platforms',
    description:
      'Companies that operate large-scale consumer platforms, marketplaces, media networks, or app ecosystems.',
    educationalRationale:
      'This basket gives users a neutral way to study network effects, user engagement, advertising, commerce, and platform economics.',
    examples: [
      {
        ticker: 'AMZN',
        companyName: 'Amazon',
        note: 'Example commerce and cloud platform company.'
      },
      {
        ticker: 'META',
        companyName: 'Meta Platforms',
        note: 'Example social media and advertising platform company.'
      },
      {
        ticker: 'NFLX',
        companyName: 'Netflix',
        note: 'Example streaming entertainment platform company.'
      }
    ],
    isStatic: true,
    nonAdvisoryNote:
      'This basket is a static educational grouping and is not a personalized recommendation, model portfolio, or buy/sell/hold list.',
    tags: ['Consumer', 'Platforms', 'Networks'],
    tickers: ['AMZN', 'META', 'NFLX']
  }
];

export function getStaticThemeBasketById(
  basketId: string
): ThemeBasket | undefined {
  return STATIC_THEME_BASKETS.find((basket) => basket.id === basketId);
}
