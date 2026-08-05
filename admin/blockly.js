'use strict';

if (typeof goog !== 'undefined') {
	goog.provide('Blockly.JavaScript.Sendto');
	goog.require('Blockly.JavaScript');
}

if (typeof Blockly === 'undefined') {
	throw new Error('Blockly is not available for MeshCore custom blocks');
}

Blockly.Words = Blockly.Words || {};
Blockly.CustomBlocks = Blockly.CustomBlocks || [];
if (!Blockly.CustomBlocks.includes('Sendto')) {
	Blockly.CustomBlocks.push('Sendto');
}

Blockly.Translate =
	Blockly.Translate ||
	function (word, lang) {
		lang = lang || systemLang;
		if (Blockly.Words && Blockly.Words[word]) {
			return Blockly.Words[word][lang] || Blockly.Words[word].en;
		}
		return word;
	};

Blockly.Sendto = Blockly.Sendto || { HUE: 310, blocks: {} };
Blockly.Sendto.blocks = Blockly.Sendto.blocks || {};

Blockly.Words['meshcore'] = {
	en: 'MeshCore',
	de: 'MeshCore',
	ru: 'MeshCore',
	pt: 'MeshCore',
	nl: 'MeshCore',
	fr: 'MeshCore',
	it: 'MeshCore',
	es: 'MeshCore',
	pl: 'MeshCore',
	uk: 'MeshCore',
	'zh-cn': 'MeshCore',
};
Blockly.Words['meshcore_public'] = {
	en: 'MeshCore public message',
	de: 'MeshCore Public-Nachricht',
	ru: 'Публичное сообщение MeshCore',
	pt: 'Mensagem pública MeshCore',
	nl: 'MeshCore publiek bericht',
	fr: 'Message public MeshCore',
	it: 'Messaggio pubblico MeshCore',
	es: 'Mensaje público MeshCore',
	pl: 'Publiczna wiadomość MeshCore',
	uk: 'Публічне повідомлення MeshCore',
	'zh-cn': 'MeshCore 公共消息',
};
Blockly.Words['meshcore_channel_message'] = {
	en: 'MeshCore channel message',
	de: 'MeshCore Channel-Nachricht',
	ru: 'Сообщение канала MeshCore',
	pt: 'Mensagem de canal MeshCore',
	nl: 'MeshCore kanaalbericht',
	fr: 'Message de canal MeshCore',
	it: 'Messaggio canale MeshCore',
	es: 'Mensaje de canal MeshCore',
	pl: 'Wiadomość kanału MeshCore',
	uk: 'Повідомлення каналу MeshCore',
	'zh-cn': 'MeshCore 频道消息',
};
Blockly.Words['meshcore_private'] = {
	en: 'MeshCore private message',
	de: 'MeshCore Privatnachricht',
	ru: 'Личное сообщение MeshCore',
	pt: 'Mensagem privada MeshCore',
	nl: 'MeshCore privébericht',
	fr: 'Message privé MeshCore',
	it: 'Messaggio privato MeshCore',
	es: 'Mensaje privado MeshCore',
	pl: 'Prywatna wiadomość MeshCore',
	uk: 'Приватне повідомлення MeshCore',
	'zh-cn': 'MeshCore 私信',
};
Blockly.Words['meshcore_instance'] = {
	en: 'instance',
	de: 'Instanz',
	ru: 'экземпляр',
	pt: 'instância',
	nl: 'instantie',
	fr: 'instance',
	it: 'istanza',
	es: 'instancia',
	pl: 'instancja',
	uk: 'екземпляр',
	'zh-cn': '实例',
};
Blockly.Words['meshcore_channel'] = {
	en: 'channel',
	de: 'Channel',
	ru: 'канал',
	pt: 'canal',
	nl: 'kanaal',
	fr: 'canal',
	it: 'canale',
	es: 'canal',
	pl: 'kanał',
	uk: 'канал',
	'zh-cn': '频道',
};
Blockly.Words['meshcore_target'] = {
	en: 'target',
	de: 'Ziel',
	ru: 'цель',
	pt: 'alvo',
	nl: 'doel',
	fr: 'cible',
	it: 'destinazione',
	es: 'destino',
	pl: 'cel',
	uk: 'ціль',
	'zh-cn': '目标',
};
Blockly.Words['meshcore_message'] = {
	en: 'message',
	de: 'Nachricht',
	ru: 'сообщение',
	pt: 'mensagem',
	nl: 'bericht',
	fr: 'message',
	it: 'messaggio',
	es: 'mensaje',
	pl: 'wiadomość',
	uk: 'повідомлення',
	'zh-cn': '消息',
};
Blockly.Words['meshcore_tooltip_public'] = {
	en: 'Send a public MeshCore message',
	de: 'Eine öffentliche MeshCore-Nachricht senden',
};
Blockly.Words['meshcore_tooltip_channel'] = {
	en: 'Send a MeshCore channel message',
	de: 'Eine MeshCore-Channel-Nachricht senden',
};
Blockly.Words['meshcore_tooltip_private'] = {
	en: 'Send a private MeshCore message',
	de: 'Eine private MeshCore-Nachricht senden',
};
Blockly.Words['meshcore_anyInstance'] = {
	en: 'all instances',
	de: 'Alle Instanzen',
	ru: 'Все экземпляры',
	pt: 'Todas as instâncias',
	nl: 'Alle instanties',
	fr: 'Toutes les instances',
	it: 'Tutte le istanze',
	es: 'Todas las instancias',
	pl: 'Wszystkie instancje',
	uk: 'Всі екземпляри',
	'zh-cn': '所有实例',
};
Blockly.Words['meshcore_help'] = {
	en: 'https://github.com/goerdy/ioBroker.meshcore',
	de: 'https://github.com/goerdy/ioBroker.meshcore',
};

function meshcoreInstanceOptions() {
	var options = [];

	if (typeof main !== 'undefined' && main.instances) {
		for (var i = 0; i < main.instances.length; i++) {
			var match = main.instances[i].match(/^system\.adapter\.meshcore\.(\d+)$/);
			if (match) {
				options.push(['meshcore.' + match[1], '.' + match[1]]);
			}
		}
	}

	if (!options.length) {
		for (var j = 0; j <= 4; j++) {
			options.push(['meshcore.' + j, '.' + j]);
		}
	}

	options.unshift([Blockly.Translate('meshcore_anyInstance'), '']);
	return options;
}

function meshcoreValueToCode(block, name) {
	return Blockly.JavaScript.valueToCode(block, name, Blockly.JavaScript.ORDER_ATOMIC) || '\'\'';
}

Blockly.Sendto.blocks['meshcore_send_public'] =
	'<block type="meshcore_send_public">' +
	'  <field name="INSTANCE"></field>' +
	'  <value name="MESSAGE">' +
	'    <shadow type="text">' +
	'      <field name="TEXT"></field>' +
	'    </shadow>' +
	'  </value>' +
	'</block>';

Blockly.Sendto.blocks['meshcore_send_channel'] =
	'<sep gap="5"></sep>' +
	'<block type="meshcore_send_channel">' +
	'  <field name="INSTANCE"></field>' +
	'  <value name="CHANNEL">' +
	'    <shadow type="text">' +
	'      <field name="TEXT">1</field>' +
	'    </shadow>' +
	'  </value>' +
	'  <value name="MESSAGE">' +
	'    <shadow type="text">' +
	'      <field name="TEXT"></field>' +
	'    </shadow>' +
	'  </value>' +
	'</block>';

Blockly.Sendto.blocks['meshcore_send_private'] =
	'<sep gap="5"></sep>' +
	'<block type="meshcore_send_private">' +
	'  <field name="INSTANCE"></field>' +
	'  <value name="TARGET">' +
	'    <shadow type="text">' +
	'      <field name="TEXT"></field>' +
	'    </shadow>' +
	'  </value>' +
	'  <value name="MESSAGE">' +
	'    <shadow type="text">' +
	'      <field name="TEXT"></field>' +
	'    </shadow>' +
	'  </value>' +
	'</block>';

Blockly.Blocks['meshcore_send_public'] = {
	init: function () {
		this.appendDummyInput('INSTANCE')
			.appendField(Blockly.Translate('meshcore_public'))
			.appendField(new Blockly.FieldDropdown(meshcoreInstanceOptions()), 'INSTANCE');

		this.appendValueInput('MESSAGE')
			.appendField(Blockly.Translate('meshcore_message'));

		this.setInputsInline(false);
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(Blockly.Sendto.HUE);
		this.setTooltip(Blockly.Translate('meshcore_tooltip_public'));
		this.setHelpUrl(Blockly.Translate('meshcore_help'));
	},
};

Blockly.Blocks['meshcore_send_channel'] = {
	init: function () {
		this.appendDummyInput('INSTANCE')
			.appendField(Blockly.Translate('meshcore_channel_message'))
			.appendField(new Blockly.FieldDropdown(meshcoreInstanceOptions()), 'INSTANCE');

		this.appendValueInput('CHANNEL')
			.appendField(Blockly.Translate('meshcore_channel'));

		this.appendValueInput('MESSAGE')
			.appendField(Blockly.Translate('meshcore_message'));

		this.setInputsInline(false);
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(Blockly.Sendto.HUE);
		this.setTooltip(Blockly.Translate('meshcore_tooltip_channel'));
		this.setHelpUrl(Blockly.Translate('meshcore_help'));
	},
};

Blockly.Blocks['meshcore_send_private'] = {
	init: function () {
		this.appendDummyInput('INSTANCE')
			.appendField(Blockly.Translate('meshcore_private'))
			.appendField(new Blockly.FieldDropdown(meshcoreInstanceOptions()), 'INSTANCE');

		this.appendValueInput('TARGET')
			.appendField(Blockly.Translate('meshcore_target'));

		this.appendValueInput('MESSAGE')
			.appendField(Blockly.Translate('meshcore_message'));

		this.setInputsInline(false);
		this.setPreviousStatement(true, null);
		this.setNextStatement(true, null);
		this.setColour(Blockly.Sendto.HUE);
		this.setTooltip(Blockly.Translate('meshcore_tooltip_private'));
		this.setHelpUrl(Blockly.Translate('meshcore_help'));
	},
};

Blockly.JavaScript['meshcore_send_public'] = function (block) {
	var message = meshcoreValueToCode(block, 'MESSAGE');
	return "setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.public.message', " + message + ");\n" +
		"setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.public.send', true);\n";
};

Blockly.JavaScript['meshcore_send_channel'] = function (block) {
	var channel = meshcoreValueToCode(block, 'CHANNEL');
	var message = meshcoreValueToCode(block, 'MESSAGE');
	return "setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.channel.target', " + channel + ");\n" +
		"setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.channel.message', " + message + ");\n" +
		"setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.channel.send', true);\n";
};

Blockly.JavaScript['meshcore_send_private'] = function (block) {
	var target = meshcoreValueToCode(block, 'TARGET');
	var message = meshcoreValueToCode(block, 'MESSAGE');
	return "setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.private.target', " + target + ");\n" +
		"setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.private.message', " + message + ");\n" +
		"setState('meshcore" + block.getFieldValue('INSTANCE') + ".commands.private.send', true);\n";
};
