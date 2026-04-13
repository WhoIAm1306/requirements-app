import * as XLSX from 'xlsx'

const REQUIREMENTS_HEADERS = [
  'Идентификатор задачи',
  'Краткое наименование предложения',
  'Инициатор предложения',
  'Ответственный со стороны предложения',
  'Условное разделение',
  'Предложение',
  'Комментарии и описание проблем',
  'Обсуждение',
  'Приоритет (очередь)',
  'Примечание',
  'ГК',
  'П.п. ТЗ',
  'П.п. НМЦК',
  'Статус',
  'Система',
] as const

export function downloadRequirementsTemplate() {
  const example1 = [
    '',
    'Пример предложения',
    'ГБУ "Система 112"',
    'Иванов Иван Иванович',
    'Инфраструктура',
    'Текст предложения',
    'Описание проблемы',
    'Краткое обсуждение',
    '1 очередь',
    'Примечание',
    'ГК ОИБ 2.0',
    'п.3.1.1.1.1.2',
    '1.1.2',
    'В обработку',
    '112',
  ]

  const example2 = [
    '',
    'Пример: статус после «Новое»',
    'ГБУ "Система 112"',
    'Петров Пётр Петрович',
    'Раздел 2',
    'Текст для обсуждения',
    '',
    '',
    '2 очередь',
    '',
    'ГК ОИБ 2.0',
    '',
    '',
    'Требуется обсуждение',
    '112',
  ]

  const example3 = [
    '',
    'Пример: раздел «Телефония» + система 112',
    '',
    'Иванов И.И.',
    'Телефония',
    'Текст',
    '',
    '',
    '1 очередь',
    '',
    '',
    '',
    '',
    'Новое',
    '112',
  ]

  const rows = [Array.from(REQUIREMENTS_HEADERS), example1, example2, example3]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Предложения')
  XLSX.writeFile(workbook, 'template_requirements.xlsx')
}

export function downloadTZTemplate() {
  const rows = [
    ['Код', 'Текст'],
    ['п.3.1.1.1.1.2', 'Если функция есть, то в рамках рефакторинга, если нет, то развития'],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Пункты ТЗ')
  XLSX.writeFile(workbook, 'template_tz_points.xlsx')
}

export function downloadGKFunctionsTemplate() {
  const rows = [
    [
      'Наименование функции',
      'Этап',
      'Номер функции по НМЦК',
      'Номер раздела по ТЗ',
      'Ссылка на Jira',
    ],
    ['Пример функции', '1', '10', '3.1.1', 'https://jira.example/browse/PROJ-1'],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Функции ТЗ')
  XLSX.writeFile(workbook, 'template_gk_tz_functions.xlsx')
}
