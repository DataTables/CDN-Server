export default {
		buildLocation: 'cache/',
		buildMessage: `/*
		* This combined file was created by the DataTables downloader builder:
		*   https://datatables.net/download
		*
		* To rebuild or modify this file with the latest versions of the included
		* software please visit:
		*   https://datatables.net/download/#{extensionsURL}
		*
		* Included libraries:
		*   {extensionsList}
		*/`,
		elements: [
			{
				abbr: 'dt',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					styling: 'dataTables'
				},
				fileNames: {},
				folderName: 'DataTables',
				order: 10,
				position: 0,
				versions: [
					''
				]
			}, {
				abbr: 'se-',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					qwerty: 'ytrewq',
					styling: 'semanic'
				},
				fileNames: {
					css: ['semantic'],
					js: ['semantic']
				},
				folderName: 'SemanticUI',
				order: 10,
				versions: [
					'',
					'2.2.13'
				]
			}, {
				abbr: 'se',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					styling: 'semantic'
				},
				fileNames: {},
				folderName: 'SemanticUI',
				order: 10,
				versions: [
					''
				]
			}, {
				abbr: 'bs4',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					styling: 'bootstrap4'
				},
				fileNames: {},
				folderName: 'Bootstrap-4',
				order: 10,
				versions: [
					'',
				]
			}, {
				abbr: 'bs4-',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {},
				fileNames: {
					css: ['css/bootstrap'],
					js: ['js/bootstrap']
				},
				folderName: 'Bootstrap-4',
				order: 10,
				versions: [
					'',
					'4.1.1',
					'4.0.0'
				]
			}, {
				abbr: 'bs',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					styling: 'bootstrap'
				},
				fileNames: {},
				folderName: 'Bootstrap',
				order: 10,
				versions: [
					'',
				],
			}, {
				abbr: 'bs-',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					styling: 'bootstrap'
				},
				fileNames: {
					css: ['bootstrap'],
					js: ['bootstrap']
				},
				folderName: 'Bootstrap',
				order: 10,
				versions: [
					'',
					'3.3.7',
					'3.3.5',
					'3.3.6'
				]
			}, {
				abbr: 'zf',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {},
				fileNames: {},
				folderName: 'Foundation',
				order: 10,
				versions: [
					'',
				]
			}, {
				abbr: 'zf-',
				excludes: [
					'dt',
					'se',
					'se-',
					'bs4',
					'bs4-',
					'bs',
					'bs-',
					'zf',
					'zf-'
				],
				fileIncludes: {
					styling: 'foundation'
				},
				fileNames: {
					css: ['css/foundation'],
					js: ['js/foundation']
				},
				folderName: 'Foundation',
				order: 10,
				versions: [
					'',
					'6.4.3',
					'5.5.2'
				]
			}, {
				abbr: 'dt-',
				excludes: [
					'dt-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/jquery.dataTables',
						'css/dataTables.{styling}'
					],
					js: [
						'js/jquery.dataTables',
						'js/dataTables.{styling}'
					],
				},
				folderName: 'DataTables',
				order: 30,
				versions: [
					'1.10.1',
					'1.10.2',
					'1.10.3',
					'1.10.4',
					'1.10.5',
					'1.10.6',
					'1.10.7',
					'1.10.8',
					'1.10.9',
					'1.10.10',
					'1.10.11',
					'1.10.12',
					'1.10.13',
					'1.10.14',
					'1.10.15',
					'1.10.16',
					'1.10.17',
					'1.10.18',
					'1.10.19',
					'1.10.20'
				],
			}, {
				abbr: 'jqc-',
				excludes: [
					'jqc-',
					'jq-'
				],
				fileIncludes: {},
				fileNames: {
					js: ['jquery-{version}']
				},
				folderName: 'jQuery',
				order: 20,
				versions: [
					'1.12.4',
					'1.11.3',
					'1.12.0',
					'1.12.3',
				]
			}, {
				abbr: 'jq-',
				excludes: [
					'jq-',
					'jqc-'
				],
				fileIncludes: {},
				fileNames: {
					js: ['jquery-{version}']
				},
				folderName: 'jQuery',
				order: 20,
				versions: [
					'3.3.1',
					'2.1.4',
					'2.2.0',
					'2.2.3',
					'3.2.1',
					'1.12.4'
				],
			}, {
				abbr: 'af-',
				excludes: [
					'af'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.autoFill',
						'css/autoFill.{styling}'
					],
					js: [
						'js/dataTables.autoFill',
						'js/autoFill.{styling}'
					]
				},
				folderName: 'AutoFill',
				order: 40,
				versions: [
					'2.3.3',
					'2.3.0',
					'2.2.2',
					'2.2.1',
					'2.2.0',
					'2.1.3',
					'2.1.2',
					'2.1.1',
					'2.1.0',
					'2.0.0',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.0'
				],
			}, {
				abbr: 'b-',
				excludes: [
					'b-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.buttons',
						'css/buttons.{styling}'
					],
					js: [
						'js/dataTables.buttons',
						'js/buttons.{styling}'
					]
				},
				folderName: 'Buttons',
				order: 40,
				versions: [
					'1.5.6',
					'1.5.5',
					'1.5.2',
					'1.5.1',
					'1.5.0',
					'1.4.2',
					'1.4.1',
					'1.4.0',
					'1.3.1',
					'1.3.0',
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'cr-',
				excludes: [
					'cr-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.colReorder',
						'css/colReorder.{styling}'
					],
					js: [
						'js/dataTables.colReorder',
						'js/colReorder.{styling}'
					],
				},
				folderName: 'ColReorder',
				order: 40,
				versions: [
					'1.5.0',
					'1.4.1',
					'1.4.0',
					'1.3.3',
					'1.3.2',
					'1.3.1',
					'1.3.0',
					'1.2.0',
					'1.1.3',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.8',
					'1.0.7',
					'1.0.6',
					'1.0.5',
					'1.0.4',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'fc-',
				excludes: [
					'fc-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.fixedColumns',
						'css/fixedColumns.{styling}'
					],
					js: [
						'js/dataTables.fixedColumns',
						'js/fixedColumns.{styling}'
					]
				},
				folderName: 'FixedColumns',
				order: 40,
				versions: [
					'3.2.5',
					'3.2.4',
					'3.2.3',
					'3.2.2',
					'3.2.1',
					'3.2.0',
					'3.1.0',
					'3.0.4',
					'3.0.3',
					'3.0.2',
					'3.0.1',
					'3.0.0',
					'2.0.3',
					'2.0.1',
					'2.0.0',
					'1.1.0',
					'1.0.1',
					'1.0.0'
				]
			}, {
				abbr: 'fh-',
				excludes: [
					'fh-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.fixedHeader',
						'css/fixedHeader.{styling}'
					],
					js: [
						'js/dataTables.fixedHeader',
						'js/fixedHeader.{styling}'
					]
				},
				folderName: 'FixedHeader',
				order: 40,
				versions: [
					'3.1.4',
					'3.1.3',
					'3.1.2',
					'3.1.1',
					'3.1.0',
					'3.0.0',
					'2.1.2',
					'2.1.1',
					'2.1.0',
					'2.0.6',
					'2.0.5',
					'2.0.4',
					'2.0.3',
					'2.0.2',
					'2.0.1',
					'2.0.0'
				],
			}, {
				abbr: 'kt-',
				excludes: [
					'kt-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.keyTable',
						'css/keyTable.{styling}'
					],
					js: [
						'js/dataTables.keyTable',
						'js/keyTable.{styling}'
					],
				},
				folderName: 'KeyTable',
				order: 40,
				versions: [
					'2.5.0',
					'2.4.1',
					'2.4.0',
					'2.3.2',
					'2.3.1',
					'2.3.0',
					'2.2.1',
					'2.2.0',
					'2.1.3',
					'2.1.2',
					'2.1.1',
					'2.1.0',
					'2.0.0',
					'1.2.1',
					'1.2.0',
					'1.1.7',
					'1.1.6',
					'1.1.5',
					'1.1.4',
					'1.1.3',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.4',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'r-',
				excludes: [
					'r-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.responsive',
						'css/responsive.{styling}'
					],
					js: [
						'js/dataTables.responsive',
						'js/responsive.{styling}'
					]
				},
				folderName: 'Responsive',
				order: 40,
				versions: [
					'2.2.2',
					'2.2.1',
					'2.2.0',
					'2.1.1',
					'2.1.0',
					'2.0.2',
					'2.0.1',
					'2.0.0',
					'1.0.7',
					'1.0.6',
					'1.0.5',
					'1.0.4',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'rg-',
				excludes: [
					'rg-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.rowGroup',
						'css/rowGroup.{styling}'
					],
					js: [
						'js/dataTables.rowGroup',
						'js/rowGroup.{styling}'
					]
				},
				folderName: 'RowGroup',
				order: 40,
				versions: [
					'1.1.0',
					'1.0.4',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				]
			}, {
				abbr: 'rr-',
				excludes: [
					'rr-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.rowReorder',
						'css/rowReorder.{styling}'
					],
					js: [
						'js/dataTables.rowReorder',
						'js/rowReorder.{styling}'
					]
					},
				folderName: 'RowReorder',
				order: 40,
				versions: [
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.0'
				]
			}, {
				abbr: 'sc-',
				excludes: [
					'sc-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.scroller',
						'css/scroller.{styling}'
					],
					js: [
						'js/dataTables.scroller',
						'js/scroller.{styling}'
					]
				},
				folderName: 'Scroller',
				order: 40,
				versions: [
					'2.0.0',
					'1.5.0',
					'1.4.4',
					'1.4.3',
					'1.4.2',
					'1.4.1',
					'1.4.0',
					'1.3.0',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.0',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'sl-',
				excludes: [
					'sl-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/dataTables.select',
						'css/select.{styling}'
					],
					js: [
						'js/dataTables.select',
						'js/select.{styling}'
					],
				},
				folderName: 'Select',
				order: 40,
				versions: [
					'1.3.0',
					'1.2.6',
					'1.2.5',
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'b-colvis-',
				excludes: [
					'b-colvis-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'js/buttons.colVis'
					]
				},
				folderName: 'Buttons',
				order: 40,
				versions: [
					'1.5.6',
					'1.5.5',
					'1.5.2',
					'1.5.1',
					'1.5.0',
					'1.4.2',
					'1.4.1',
					'1.4.0',
					'1.3.1',
					'1.3.0',
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'b-flash-',
				excludes: [
					'b-flash-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'js/buttons.flash'
					]
				},
				folderName: 'Buttons',
				order: 40,
				versions: [
					'1.5.6',
					'1.5.5',
					'1.5.2',
					'1.5.1',
					'1.5.0',
					'1.4.2',
					'1.4.1',
					'1.4.0',
					'1.3.1',
					'1.3.0',
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				]
			}, {
				abbr: 'b-html5-',
				excludes: [
					'b-html5-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'js/buttons.html5'
					]
				},
				folderName: 'HTML5',
				order: 40,
				versions: [
					'1.5.6',
					'1.5.5',
					'1.5.2',
					'1.5.1',
					'1.5.0',
					'1.4.2',
					'1.4.1',
					'1.4.0',
					'1.3.1',
					'1.3.0',
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'b-print-',
				excludes: [
					'b-print-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'js/buttons.print'
					]
				},
				folderName: 'Print',
				order: 40,
				versions: [
					'1.5.6',
					'1.5.5',
					'1.5.2',
					'1.5.1',
					'1.5.0',
					'1.4.2',
					'1.4.1',
					'1.4.0',
					'1.3.1',
					'1.3.0',
					'1.2.4',
					'1.2.3',
					'1.2.2',
					'1.2.1',
					'1.2.0',
					'1.1.2',
					'1.1.1',
					'1.1.0',
					'1.0.3',
					'1.0.2',
					'1.0.1',
					'1.0.0'
				],
			}, {
				abbr: 'jszip-',
				excludes: [
					'jszip-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'jszip'
					]
				},
				folderName: 'JSZip',
				order: 20,
				versions: [
					'2.5.0',
					'3.1.3'
				]
			}, {
				abbr: 'pdfmake-',
				excludes: [
					'pdfmake-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'pdfmake'
					]
				},
				folderName: 'pdfmake',
				order: 20,
				versions: [
					'0.1.18',
					'0.1.27',
					'0.1.32',
					'0.1.36'
				]
			}, {
				abbr: 'moment-',
				excludes: [
					'moment-',
					'momentjs-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'moment'
					]
				},
				folderName: 'Moment',
				order: 20,
				versions: [
					'2.18.1'
				],
			}, {
				abbr: 'momentjs-',
				excludes: [
					'momentjs-',
					'moment-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'moment'
					]
				},
				folderName: 'MomentJS',
				order: 20,
				versions: [
					'2.10.6',
					'2.11.2',
					'2.14.0',
					'2.18.1'
				],
			}, {
				abbr: 'selectize-',
				excludes: [
					'selectize-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/selectize'
					],
					js: [
						'js/selectize'
					]
				},
				folderName: 'Selectize',
				order: 20,
				versions: [
					'0.12.1'
				]
			}, {
				abbr: 'select2-',
				excludes: [
					'select2-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/select2'
					],
					js: [
						'js/select2'
					]
				},
				folderName: 'Select2',
				order: 20,
				versions: [
					'4.0.0',
					'4.0.1'
				],
			}, {
				abbr: 'quill-',
				excludes: [
					'quill-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'quill.snow'
					],
					js: [
						'quill'
					]
				},
				folderName: 'Quill',
				order: 20,
				versions: [
					'0.20.0',
					'0.20.1',
					'1.2.4'
				],
			}, {
				abbr: 'mask-',
				excludes: [
					'mask-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'editor.mask'
					]
				},
				folderName: 'FieldType-Mask',
				order: 20,
				versions: [
					'1.13.4'
				]
			}, {
				abbr: 'date-',
				excludes: [
					'date-'
				],
				fileIncludes: {},
				fileNames: {
					css: [
						'css/bootstrap-datetimepicker'
					],
					js: [
						'js/bootstrap-datetimepicker'
					],
				},
				folderName: 'bootstrap-datepicker-4.15.35',
				order: 20,
				versions: [
					'4.15.35'
				]
			}, {
				abbr: 'ef-display-',
				excludes: [
					'ef-display-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'editor.display'
					]
				},
				folderName: 'FieldType-Display',
				order: 40,
				versions: [
					'1.0.0',
					'1.5.6',
					'1.6.2'
				]
			}, {
				abbr: 'ef-quill-',
				excludes: [
					'ef-quill-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'editor.quill'
					]
				},
				folderName: 'FieldType-Quill',
				order: 40,
				versions: [
					'0.20.0',
					'0.20.1',
					'1.5.6',
					'1.6.2'
				],
			}, {
				abbr: 'ef-select2-',
				excludes: [
					'ef-select2-'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'editor.select2'
					]
				},
				folderName: 'FieldType-Select2',
				order: 40,
				versions: [
					'1.5.6',
					'1.6.2',
					'4.0.1'
				],
			}, {
				abbr: 'ef-selectize',
				excludes: [
					'ef-selectize'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'editor.selectize'
					]
				},
				folderName: 'FieldType-Selectize',
				order: 40,
				versions: [
					'0.12.1',
					'1.5.6',
					'1.6.2'
				],
			}, {
				abbr: 'ef-title',
				excludes: [
					'ef-title'
				],
				fileIncludes: {},
				fileNames: {
					js: [
						'editor.title'
					]
				},
				folderName: 'FieldType-Title',
				order: 40,
				versions: [
					'1.0.0',
					'1.5.6',
					'1.6.2'
				]
			}
		],
		fileNames: ['datatables'],
		requires: [10],
		substitutions: {
			extensionsList: '{extensionsList}',
			extensionsURL: '{extensionsURL}'
		},
	};
