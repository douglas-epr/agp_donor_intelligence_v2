import { DonorSegment, GiftChannel, GiftRegion, Campaign } from "@/lib/constants/enums";
import type { DonorGift } from "./types";

// 50 rows covering all enum variants, date spread (Jan–Jun 2024 + 2023 history),
// and realistic gift amounts per segment. Used as the Phase 1 data source.
export const mockDonors: DonorGift[] = [
  // Major Gifts — large amounts, low volume
  { id: "g001", donor_id: "AGP-8821", donor_name: "Jonathan Arbuckle",   segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-03-12", gift_amount: 12500, campaign: Campaign.MAJOR_GIFT_GALA,    channel: GiftChannel.EVENT,       region: GiftRegion.NORTHEAST },
  { id: "g002", donor_id: "AGP-8823", donor_name: "Michael Sterling",    segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-03-11", gift_amount:  5000, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.MIDWEST   },
  { id: "g003", donor_id: "AGP-8827", donor_name: "Robert Wilson",       segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-03-10", gift_amount: 25000, campaign: Campaign.MAJOR_GIFT_GALA,    channel: GiftChannel.EVENT,       region: GiftRegion.WEST      },
  { id: "g004", donor_id: "AGP-8829", donor_name: "Lisa Cuddy",          segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-03-08", gift_amount: 15000, campaign: Campaign.CAPITAL_CAMPAIGN,   channel: GiftChannel.PHONE,       region: GiftRegion.SOUTH     },
  { id: "g005", donor_id: "AGP-8831", donor_name: "Thomas Hartwell",     segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-02-22", gift_amount:  8000, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.NORTHEAST },
  { id: "g006", donor_id: "AGP-8833", donor_name: "Patricia Nguyen",     segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-02-14", gift_amount: 20000, campaign: Campaign.CAPITAL_CAMPAIGN,   channel: GiftChannel.EMAIL,       region: GiftRegion.WEST      },
  { id: "g007", donor_id: "AGP-8835", donor_name: "Richard Calloway",    segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-01-30", gift_amount: 10000, campaign: Campaign.MAJOR_GIFT_GALA,    channel: GiftChannel.EVENT,       region: GiftRegion.MIDWEST   },
  { id: "g008", donor_id: "AGP-8821", donor_name: "Jonathan Arbuckle",   segment: DonorSegment.MAJOR_GIFT, gift_date: "2023-11-15", gift_amount: 10000, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.NORTHEAST },

  // Mid-Level — medium amounts
  { id: "g009", donor_id: "AGP-8824", donor_name: "Elena Rodriguez",     segment: DonorSegment.MID_LEVEL,  gift_date: "2024-03-11", gift_amount:  1200, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.SOUTH     },
  { id: "g010", donor_id: "AGP-8830", donor_name: "James Wilson",        segment: DonorSegment.MID_LEVEL,  gift_date: "2024-03-07", gift_amount:  2500, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.ONLINE,      region: GiftRegion.NORTHEAST },
  { id: "g011", donor_id: "AGP-8836", donor_name: "Sandra Okafor",       segment: DonorSegment.MID_LEVEL,  gift_date: "2024-02-28", gift_amount:  1800, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.MIDWEST   },
  { id: "g012", donor_id: "AGP-8838", donor_name: "Kevin Brennan",       segment: DonorSegment.MID_LEVEL,  gift_date: "2024-02-20", gift_amount:  3000, campaign: Campaign.CAPITAL_CAMPAIGN,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.WEST      },
  { id: "g013", donor_id: "AGP-8840", donor_name: "Michelle Torres",     segment: DonorSegment.MID_LEVEL,  gift_date: "2024-02-10", gift_amount:  1500, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.ONLINE,      region: GiftRegion.SOUTH     },
  { id: "g014", donor_id: "AGP-8842", donor_name: "Daniel Park",         segment: DonorSegment.MID_LEVEL,  gift_date: "2024-01-25", gift_amount:  2000, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.NORTHEAST },
  { id: "g015", donor_id: "AGP-8844", donor_name: "Angela Foster",       segment: DonorSegment.MID_LEVEL,  gift_date: "2024-01-15", gift_amount:  1100, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.PHONE,       region: GiftRegion.MIDWEST   },
  { id: "g016", donor_id: "AGP-8824", donor_name: "Elena Rodriguez",     segment: DonorSegment.MID_LEVEL,  gift_date: "2023-10-05", gift_amount:  1000, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.EMAIL,       region: GiftRegion.SOUTH     },

  // Sustainer — small recurring amounts
  { id: "g017", donor_id: "AGP-8822", donor_name: "Sarah Jenkins",       segment: DonorSegment.SUSTAINER,  gift_date: "2024-03-01", gift_amount:   450, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.WEST      },
  { id: "g018", donor_id: "AGP-8828", donor_name: "Amanda S.",           segment: DonorSegment.SUSTAINER,  gift_date: "2024-03-09", gift_amount:    50, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.NORTHEAST },
  { id: "g019", donor_id: "AGP-8822", donor_name: "Sarah Jenkins",       segment: DonorSegment.SUSTAINER,  gift_date: "2024-02-01", gift_amount:   450, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.WEST      },
  { id: "g020", donor_id: "AGP-8828", donor_name: "Amanda S.",           segment: DonorSegment.SUSTAINER,  gift_date: "2024-02-09", gift_amount:    50, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.NORTHEAST },
  { id: "g021", donor_id: "AGP-8846", donor_name: "Christopher Lane",    segment: DonorSegment.SUSTAINER,  gift_date: "2024-03-05", gift_amount:   120, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.SOUTH     },
  { id: "g022", donor_id: "AGP-8848", donor_name: "Deborah Mills",       segment: DonorSegment.SUSTAINER,  gift_date: "2024-03-05", gift_amount:    75, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.EMAIL,       region: GiftRegion.MIDWEST   },
  { id: "g023", donor_id: "AGP-8846", donor_name: "Christopher Lane",    segment: DonorSegment.SUSTAINER,  gift_date: "2024-02-05", gift_amount:   120, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.SOUTH     },
  { id: "g024", donor_id: "AGP-8848", donor_name: "Deborah Mills",       segment: DonorSegment.SUSTAINER,  gift_date: "2024-02-05", gift_amount:    75, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.EMAIL,       region: GiftRegion.MIDWEST   },

  // First-Time donors
  { id: "g025", donor_id: "AGP-8826", donor_name: "Gregory House",       segment: DonorSegment.FIRST_TIME, gift_date: "2024-03-08", gift_amount:  1000, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.NORTHEAST },
  { id: "g026", donor_id: "AGP-8850", donor_name: "Natalie Voss",        segment: DonorSegment.FIRST_TIME, gift_date: "2024-03-15", gift_amount:   250, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.ONLINE,      region: GiftRegion.WEST      },
  { id: "g027", donor_id: "AGP-8852", donor_name: "Aaron Patel",         segment: DonorSegment.FIRST_TIME, gift_date: "2024-02-25", gift_amount:   500, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.SOUTH     },
  { id: "g028", donor_id: "AGP-8854", donor_name: "Brittany Walsh",      segment: DonorSegment.FIRST_TIME, gift_date: "2024-02-18", gift_amount:   150, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.MIDWEST   },
  { id: "g029", donor_id: "AGP-8856", donor_name: "Carlos Mendez",       segment: DonorSegment.FIRST_TIME, gift_date: "2024-01-20", gift_amount:   300, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.ONLINE,      region: GiftRegion.NORTHEAST },
  { id: "g030", donor_id: "AGP-8858", donor_name: "Diana Chen",          segment: DonorSegment.FIRST_TIME, gift_date: "2024-01-10", gift_amount:   200, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.EMAIL,       region: GiftRegion.WEST      },

  // Lapsed donors — older dates, smaller amounts
  { id: "g031", donor_id: "AGP-8825", donor_name: "David Chen",          segment: DonorSegment.LAPSED,     gift_date: "2024-03-10", gift_amount:   250, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.MIDWEST   },
  { id: "g032", donor_id: "AGP-8860", donor_name: "Frances Kim",         segment: DonorSegment.LAPSED,     gift_date: "2023-12-20", gift_amount:   180, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.SOUTH     },
  { id: "g033", donor_id: "AGP-8862", donor_name: "George Abbott",       segment: DonorSegment.LAPSED,     gift_date: "2023-11-08", gift_amount:   350, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.PHONE,       region: GiftRegion.NORTHEAST },
  { id: "g034", donor_id: "AGP-8864", donor_name: "Helen Marsh",         segment: DonorSegment.LAPSED,     gift_date: "2023-09-14", gift_amount:   125, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.WEST      },
  { id: "g035", donor_id: "AGP-8866", donor_name: "Ivan Petrov",         segment: DonorSegment.LAPSED,     gift_date: "2023-06-22", gift_amount:   200, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.ONLINE,      region: GiftRegion.MIDWEST   },

  // General donors
  { id: "g036", donor_id: "AGP-8832", donor_name: "Linda Thornton",      segment: DonorSegment.GENERAL,    gift_date: "2024-03-20", gift_amount:   400, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.SOUTH     },
  { id: "g037", donor_id: "AGP-8834", donor_name: "Marcus Webb",         segment: DonorSegment.GENERAL,    gift_date: "2024-03-18", gift_amount:   150, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.ONLINE,      region: GiftRegion.NORTHEAST },
  { id: "g038", donor_id: "AGP-8868", donor_name: "Julia Graves",        segment: DonorSegment.GENERAL,    gift_date: "2024-02-28", gift_amount:    75, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.WEST      },
  { id: "g039", donor_id: "AGP-8870", donor_name: "Kyle Hoffman",        segment: DonorSegment.GENERAL,    gift_date: "2024-02-15", gift_amount:   200, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.MIDWEST   },
  { id: "g040", donor_id: "AGP-8872", donor_name: "Laura Simpson",       segment: DonorSegment.GENERAL,    gift_date: "2024-01-28", gift_amount:   100, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.SOUTH     },

  // Additional rows to extend date coverage for charts (Apr–Jun 2024)
  { id: "g041", donor_id: "AGP-8874", donor_name: "Nathan Ford",         segment: DonorSegment.MID_LEVEL,  gift_date: "2024-04-10", gift_amount:  2200, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.NORTHEAST },
  { id: "g042", donor_id: "AGP-8876", donor_name: "Olivia Grant",        segment: DonorSegment.FIRST_TIME, gift_date: "2024-04-22", gift_amount:   350, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.ONLINE,      region: GiftRegion.WEST      },
  { id: "g043", donor_id: "AGP-8878", donor_name: "Peter Holt",          segment: DonorSegment.SUSTAINER,  gift_date: "2024-04-05", gift_amount:    90, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.SOUTH     },
  { id: "g044", donor_id: "AGP-8880", donor_name: "Quinn Adler",         segment: DonorSegment.MID_LEVEL,  gift_date: "2024-05-14", gift_amount:  1700, campaign: Campaign.CAPITAL_CAMPAIGN,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.MIDWEST   },
  { id: "g045", donor_id: "AGP-8882", donor_name: "Rachel Bloom",        segment: DonorSegment.GENERAL,    gift_date: "2024-05-08", gift_amount:   225, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.NORTHEAST },
  { id: "g046", donor_id: "AGP-8823", donor_name: "Michael Sterling",    segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-05-22", gift_amount:  6000, campaign: Campaign.CAPITAL_CAMPAIGN,   channel: GiftChannel.PHONE,       region: GiftRegion.MIDWEST   },
  { id: "g047", donor_id: "AGP-8884", donor_name: "Steven Nakamura",     segment: DonorSegment.FIRST_TIME, gift_date: "2024-06-03", gift_amount:   175, campaign: Campaign.SPRING_DRIVE,       channel: GiftChannel.EMAIL,       region: GiftRegion.WEST      },
  { id: "g048", donor_id: "AGP-8886", donor_name: "Tina Morales",        segment: DonorSegment.SUSTAINER,  gift_date: "2024-06-05", gift_amount:    60, campaign: Campaign.SUSTAINER_PROGRAM,  channel: GiftChannel.ONLINE,      region: GiftRegion.SOUTH     },
  { id: "g049", donor_id: "AGP-8888", donor_name: "Ursula Fleming",      segment: DonorSegment.LAPSED,     gift_date: "2024-06-18", gift_amount:   300, campaign: Campaign.YEAR_END_APPEAL,   channel: GiftChannel.DIRECT_MAIL, region: GiftRegion.NORTHEAST },
  { id: "g050", donor_id: "AGP-8827", donor_name: "Robert Wilson",       segment: DonorSegment.MAJOR_GIFT, gift_date: "2024-06-28", gift_amount: 18000, campaign: Campaign.MAJOR_GIFT_GALA,    channel: GiftChannel.EVENT,       region: GiftRegion.WEST      },
];
