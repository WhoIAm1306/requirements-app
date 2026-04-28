import { GK, GKFunction, GKStage, JiraEpic, JiraEpicStatus, HistoryEntry } from '../types/gk';

const jiraStatuses: JiraEpicStatus[] = ['Open', 'Analysis', 'Dev', 'DevTest', 'Closed'];
const customers = [
  'Минцифры России',
  'ФНС России',
  'Минфин России',
  'Росреестр',
  'СФР России',
  'Минэкономразвития России',
  'Ростелеком',
  'Роскомнадзор',
];

const functionNames = [
  'Модуль авторизации и аутентификации',
  'Личный кабинет пользователя',
  'Формирование и подпись документов',
  'Интеграция с СМЭВ',
  'Интеграция с Порталом Госуслуги',
  'Платёжный модуль',
  'Уведомление пользователей',
  'Формирование отчётности',
  'Журнал аудита',
  'Управление справочниками',
  'Модуль поиска и фильтрации',
  'Административная панель',
  'Интеграция с ГАС «Правосудие»',
  'Модуль электронной подписи',
  'Реестр документов',
  'Межведомственный обмен данными',
  'Подсистема хранения и архивирования',
  'Модуль мониторинга и аналитики',
  'API-шлюз внешних систем',
  'Управление правами доступа',
  'Формирование XML-пакетов',
  'Интеграция с БД ФНС',
  'Модуль печати документов',
  'Системный журнал событий',
];

const stageNames = [
  'Разработка технической документации',
  'Проектирование архитектуры',
  'Реализация и разработка',
  'Тестирование и отладка',
  'Опытная эксплуатация',
  'Внедрение и ввод в эксплуатацию',
  'Техническое сопровождение',
];

let idCounter = 1;
const genId = () => `id_${idCounter++}`;

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function genJiraEpics(count: number, gkShortName: string): JiraEpic[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `${gkShortName}-${rnd(100, 999)}`,
    summary: pick([
      'Базовый функционал',
      'Интеграционный слой',
      'UI-компоненты',
      'Backend API',
      'Тестирование',
      'Документация',
      'Исправление дефектов',
    ]),
    status: pick(jiraStatuses),
    url: `https://jira.example.com/browse/${gkShortName}-${rnd(100, 999)}`,
  }));
}

function genConfluenceLinks(count: number): string[] {
  return Array.from({ length: count }, () =>
    `https://confluence.example.com/pages/${rnd(100000, 999999)}`
  );
}

function genFunction(stageId: string, idx: number, gkShortName: string): GKFunction {
  const fnName = functionNames[idx % functionNames.length];
  return {
    id: genId(),
    functionName: fnName,
    nmckFunctionNumber: `${rnd(1, 99)}.${rnd(1, 9)}.${String(idx + 1).padStart(2, '0')}`,
    tzSectionNumber: `${rnd(3, 8)}.${rnd(1, 5)}.${idx + 1}`,
    jiraEpics: rnd(0, 1) > 0 ? genJiraEpics(rnd(1, 3), gkShortName) : [],
    confluenceLinks: rnd(0, 1) > 0 ? genConfluenceLinks(rnd(1, 2)) : [],
    updatedAt: genDate(rnd(0, 60)),
  };
}

function genStages(gkId: string, count: number, gkShortName: string): GKStage[] {
  return Array.from({ length: count }, (_, i) => {
    const stageId = genId();
    const fnCount = rnd(3, 10);
    return {
      id: stageId,
      stageNumber: i + 1,
      stageName: stageNames[i % stageNames.length],
      comment: rnd(0, 1) > 0 ? `Комментарий к этапу ${i + 1}` : undefined,
      functions: Array.from({ length: fnCount }, (__, j) =>
        genFunction(stageId, j, gkShortName)
      ),
    };
  });
}

const gkData: Array<{
  name: string;
  shortName: string;
  codePrefix: string;
  customer: string;
}> = [
  { name: 'Цифровая платформа МФЦ', shortName: 'МФЦ', codePrefix: '2021-МЦД', customer: 'Минцифры России' },
  { name: 'Модернизация АИС Налог-3', shortName: 'НАЛОГ3', codePrefix: '2021-ФНС', customer: 'ФНС России' },
  { name: 'ГИИС «Электронный бюджет»', shortName: 'ЭЛБЮД', codePrefix: '2022-МФ', customer: 'Минфин России' },
  { name: 'Федеральная государственная информационная система ЕГРН', shortName: 'ЕГРН', codePrefix: '2022-РОС', customer: 'Росреестр' },
  { name: 'Автоматизированная система СФР', shortName: 'АС-СФР', codePrefix: '2022-СФР', customer: 'СФР России' },
  { name: 'Единая система идентификации и аутентификации', shortName: 'ЕСИА', codePrefix: '2021-МЦД', customer: 'Минцифры России' },
  { name: 'Государственная информационная система ЖКХ', shortName: 'ГИС-ЖКХ', codePrefix: '2023-МСтр', customer: 'Ростелеком' },
  { name: 'Федеральная государственная ИС «Контингент»', shortName: 'КОНТИНГЕНТ', codePrefix: '2022-МП', customer: 'Минэкономразвития России' },
  { name: 'Платформа обратной связи', shortName: 'ПОС', codePrefix: '2023-МЦД', customer: 'Минцифры России' },
  { name: 'Система мониторинга налоговых поступлений', shortName: 'СМНП', codePrefix: '2023-ФНС', customer: 'ФНС России' },
  { name: 'Реестр субъектов малого предпринимательства', shortName: 'РСМП', codePrefix: '2022-ФНС', customer: 'ФНС России' },
  { name: 'Единый реестр проверок', shortName: 'ЕРП', codePrefix: '2023-МЭ', customer: 'Минэкономразвития России' },
  { name: 'Информационная система «Маркировка»', shortName: 'МАРКИРОВКА', codePrefix: '2021-МФ', customer: 'Минфин России' },
  { name: 'Цифровой паспорт объекта недвижимости', shortName: 'ЦПОН', codePrefix: '2023-РОС', customer: 'Росреестр' },
  { name: 'Система электронного документооборота', shortName: 'СЭД', codePrefix: '2022-МЦД', customer: 'Минцифры России' },
  { name: 'Федеральная информационная система избирательных документов', shortName: 'ФИСИД', codePrefix: '2023-ЦИК', customer: 'Роскомнадзор' },
  { name: 'Автоматизированная система управления государственными закупками', shortName: 'АСУ-ГЗ', codePrefix: '2022-МФ', customer: 'Минфин России' },
  { name: 'Единая медицинская информационно-аналитическая система', shortName: 'ЕМИАС', codePrefix: '2023-МЗ', customer: 'Ростелеком' },
  { name: 'Система управления государственным имуществом', shortName: 'СУГИ', codePrefix: '2023-РОС', customer: 'Росреестр' },
  { name: 'Цифровая трансформация социальных услуг', shortName: 'ЦТСУ', codePrefix: '2023-СФР', customer: 'СФР России' },
];

export function generateMockGKs(): GK[] {
  return gkData.map((d, i) => {
    const id = genId();
    const stageCount = rnd(1, 5);
    const daysAgo = rnd(0, 90);
    const status = i < 16 ? 'active' : 'archive';
    return {
      id,
      name: d.name,
      shortName: d.shortName,
      code: `${d.codePrefix}-${String(i + 1).padStart(3, '0')}`,
      customer: d.customer,
      status,
      useShortNameInId: rnd(0, 1) === 1,
      createdAt: genDate(rnd(120, 365)),
      updatedAt: genDate(daysAgo),
      note: i % 3 === 0 ? `Примечание: ${d.name}. Контракт в рамках национального проекта «Цифровая экономика».` : '',
      stages: genStages(id, stageCount, d.shortName),
    };
  });
}

export function generateHistory(gkId: string): HistoryEntry[] {
  const actions = [
    { action: 'Создание', field: undefined },
    { action: 'Изменение', field: 'Статус', oldValue: 'archive', newValue: 'active' },
    { action: 'Изменение', field: 'Заказчик', oldValue: 'ФНС России', newValue: 'Минфин России' },
    { action: 'Добавление этапа', field: 'stageName', oldValue: undefined, newValue: 'Разработка' },
    { action: 'Изменение', field: 'Наименование', oldValue: 'Старое название', newValue: 'Новое название' },
    { action: 'Добавление функции', field: 'functionName', oldValue: undefined, newValue: 'Модуль авторизации' },
    { action: 'Изменение', field: 'Примечание', oldValue: '', newValue: 'Добавлено примечание' },
  ];
  const users = ['Иванов И.И.', 'Петрова М.С.', 'Сидоров А.В.', 'Козлова Т.Н.'];
  return Array.from({ length: rnd(5, 12) }, (_, i) => {
    const entry = pick(actions);
    return {
      id: genId(),
      action: entry.action,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      user: pick(users),
      timestamp: genDate(rnd(0, 180)),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const CUSTOMERS = customers;
