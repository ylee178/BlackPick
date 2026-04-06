const PLACEHOLDER_ASSETS = [
  "/fighters/placeholders/red_hawk.png",
  "/fighters/placeholders/ko_gang.png",
  "/fighters/placeholders/rookie.png",
  "/fighters/placeholders/paraoh.png",
  "/fighters/placeholders/iron_horse.png",
] as const;

type FighterAvatarFields = {
  id?: string | null;
  name?: string | null;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
};

type ExplicitAvatarMapping = {
  asset: (typeof PLACEHOLDER_ASSETS)[number];
  aliases: string[];
};

const EXPLICIT_MAPPINGS: ExplicitAvatarMapping[] = [
  {
    asset: "/fighters/placeholders/red_hawk.png",
    aliases: ["red hawk", "redhawk", "레드호크", "레드 호크"],
  },
  {
    asset: "/fighters/placeholders/ko_gang.png",
    aliases: ["ko gang", "kogang", "k.o gang", "k.o. gang", "코리안 갱스터", "korean gangster"],
  },
  {
    asset: "/fighters/placeholders/rookie.png",
    aliases: ["rookie"],
  },
  {
    asset: "/fighters/placeholders/paraoh.png",
    aliases: ["paraoh", "pharaoh", "파라오"],
  },
  {
    asset: "/fighters/placeholders/iron_horse.png",
    aliases: ["iron horse", "아이언 호스"],
  },
];

function normalizeKey(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getStableHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export const PIXEL_AVATAR_IDS = new Set([
  "020b5ddf-8b3a-4bea-a036-3199f44f593c","022dc6e9-64eb-4a82-9a5f-48c6d461fc28",
  "03a14ba6-f023-49ef-815e-eaf08029498e","0836459b-6df7-4bbf-90d8-81471c79fc87",
  "0dd577de-e2bd-434c-b71a-b6fb98c7f89a","10ebbcf1-fbaa-4ff2-9997-08065b42f4f3",
  "130a33d2-adec-4582-9735-1a040b086c06","14e44483-a6c3-496e-b0ab-c2a98612f904",
  "1691fe33-d182-44dc-a1b7-2e0c7efdc88e","1a80c16b-aca1-4f91-b652-059a8282b7a6",
  "1d07a0cd-524b-4ce9-be48-bd305bfbf672","1e7b14e6-77e3-4a69-b9ae-8e0dc207d79b",
  "2518c1a1-0ef0-405d-ab8a-0a69f7a58852","2a403528-72a8-4bea-a3cc-f73a8c243efb",
  "2a8f12ce-6fb7-4c98-8558-7dfe7b6c511f","2c80fe65-682b-4c37-91e1-1d1bbba0d513",
  "2d9d6a14-2d86-45c2-863f-8ebb1d8f9396","2e688f9d-b8d6-4bfa-8737-a390458f3679",
  "30387b8c-1170-44b1-a144-fe77bbfcb568","340e43f5-12a4-4f7b-b274-a6cafa2381a9",
  "388c3517-c6fb-4eb5-8906-3e761aa08880","3986f087-75c8-45be-a7d7-0385dc22aaa1",
  "3b11dfcb-abeb-4781-8db1-322324951b76","3d632488-d751-4ce1-9321-222000a860e2",
  "3e250f20-b2b8-4301-b86a-fde3bcb95d31","3f063022-6b45-4fea-ac61-d7befca35eed",
  "46b1ba5e-6db0-42e2-b8fd-0e357c7c4bb5","4c6f5fe4-a8bf-4d19-a33e-faca2d7df65d",
  "4d83d097-5311-47e8-aa72-25a97d16f670","4f8de422-654f-4534-9514-e7ccec885f78",
  "503fdfd2-7b07-4f1c-b76f-22c81736da5a","5090877a-a8c7-4266-b004-f5cb7f7af5b1",
  "5252e411-68da-479f-b5e4-ab2ffa5d215d","53f11c2b-2ffb-4dce-9788-cb7f8a3db057",
  "5c3052c9-0b97-4cfc-bf88-4c706616e608",
  "639d0b8f-f01b-45f2-8da3-61e4890b9027","658ba935-e167-4987-b273-346b548c236d",
  "6f379294-1660-468c-af22-fb9661aba03e","7177e22b-379c-4967-9dbc-fc961f17411f",
  "74ed9ee4-f049-4df9-8796-4aef02e91ffe","76d0ee3b-b3da-4104-9a0f-e5c355ae31cc",
  "7a1f7b7d-a229-41ca-9685-d8b8a90fedc3","7a67f6a9-d3fe-43d7-88f7-223f86ff138b",
  "80418fb3-bf19-46b6-bb98-82190a777f49","80be8ec6-7066-429b-80d8-7f1f1fbe9263",
  "85fd9633-d856-400f-8abb-47bed53a28e8","89ba5d8e-871e-4fa0-b858-d78ff1c660f9",
  "8bd3daeb-83fa-4799-8981-bb9f85cc3a8d","8c8ef9b4-7d62-4162-ac2f-833a8d6961ea",
  "906b6651-7364-4c3a-8ee7-5df9a353f959","929723b9-59ec-49a1-a48c-d57d380fafe9",
  "94849366-fd21-4dd9-9e27-a1207ba5a89e","958635ed-8e83-453c-a0cc-3e86a8401bc3",
  "98c1fb6a-3cbc-47a6-8e99-4fe40027649a","9b631dba-f2d3-4744-95c8-3f5897645961",
  "9f106ed5-29a0-45a1-8f8d-c9e481841c62","a228f9b8-7fa1-427e-b89b-5f33679980dd",
  "a428c213-cbd4-4e46-b106-5b87cbdcba69","a4a29144-1182-4bbf-92f6-2a8b84294ee9",
  "ac1aeff6-7067-4736-9e7d-c1ce8da05cc2","afbafa3b-736b-4095-85d3-34e5425c639b",
  "b3fc7626-4450-4adc-855c-12052462cdb6","b6a04558-d625-47cf-9a63-6b21a63beb7d",
  "bc97c942-f47a-4b51-858b-0449c54c48f7","c711ed70-75e3-42a8-9855-38d29de009d4",
  "c78f95c7-2288-4877-9dbb-03d162ae9415","c87503fd-c1de-419b-b61d-2c671a55751e",
  "cad357b5-0217-43af-bb77-3b80e0fed51b","d16b9271-bfe5-4dfb-8e7e-7e7399ec65cf",
  "d29a514f-ed30-468b-bfee-a80fb6f3c624","d8be0440-679a-46e7-b7f7-3ffbb28415ac",
  "d944f4ec-ec71-4292-9396-dae9dd9dd9ae","d95e67ac-36dd-4aea-b597-5632a759bc7d",
  "ddced3e3-bb52-4b55-bdf0-d00b89ca3ae5","e328d3de-dd51-4811-8b46-176b92a4766c",
  "ec40da0b-b424-4236-89f3-3606175145f3","ef864b92-0fdb-4855-88c1-7d90906a33c6",
  "f4412a49-c879-4e38-8a5b-6351f822b44a","f46aaa3d-5ebf-44ed-8b67-d81ad5736619",
  "fb0a6c88-494a-48c1-8555-eb1ff8b8d053",
  "18491f2c-bf7f-498c-af95-264fb48005d3","5127b180-14e7-45c1-b022-cae0c969b3ff",
  "9ce0973a-f5db-4093-b52a-1021ed657a44","98c03933-1bc7-4f1e-97d5-377505107ba7",
  "f51c05b7-8de6-47ba-9b5a-61587fac125f","b6b78be0-6b29-44d1-8bff-a59a94152d60",
]);

function getPixelAvatarUrl(id: string | null | undefined): string | null {
  if (!id || !PIXEL_AVATAR_IDS.has(id)) return null;
  return `/fighters/pixel/${id}.png`;
}

export function getFighterAvatarUrl(fighter: FighterAvatarFields | null | undefined): string | null {
  if (!fighter) return null;
  if (fighter.image_url) return fighter.image_url;

  // Pixel art avatar by fighter ID
  const pixelUrl = getPixelAvatarUrl(fighter.id);
  if (pixelUrl) return pixelUrl;

  const candidates = [
    fighter.ring_name,
    fighter.name_en,
    fighter.name_ko,
    fighter.name,
  ].map(normalizeKey).filter(Boolean);

  for (const candidate of candidates) {
    const matched = EXPLICIT_MAPPINGS.find((mapping) =>
      mapping.aliases.some((alias) => normalizeKey(alias) === candidate)
    );

    if (matched) {
      return matched.asset;
    }
  }

  const stableSeed =
    fighter.id?.trim() ||
    candidates[0] ||
    `${fighter.name ?? ""}-${fighter.ring_name ?? ""}-${fighter.name_en ?? ""}-${fighter.name_ko ?? ""}`;

  return "/fighters/default.png";
}
