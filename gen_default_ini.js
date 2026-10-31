// Generate the C header with the default ini bytes of the micro sfx.
//
// usage: gen_default_ini.js <ini file> <output header>
//
// This runs under cscript /nologo /e:jscript, both from the makefile rule and
// by hand. The two globals below replace the equivalents php-sdk provides when
// the same logic ran inside config.w32

var FSO = WScript.CreateObject("Scripting.FileSystemObject");

function ERROR(text)
{
	WScript.Echo("ERROR: " + text);
	WScript.Quit(1);
}

// Encode a JScript string to UTF-8 bytes. The generated ini array must be byte
// exact, and there is no way to get the raw bytes of a text file in JScript
function micro_utf8_bytes(text)
{
	var out = [];
	for (var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if (c < 0x80) {
			out.push(c);
		} else if (c < 0x800) {
			out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
		} else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < text.length) {
			var lo = text.charCodeAt(i + 1);
			if (lo >= 0xDC00 && lo <= 0xDFFF) {
				var cp = 0x10000 + ((c - 0xD800) << 10) + (lo - 0xDC00);
				out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F),
					0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
				i++;
			} else {
				out.push(0xEF, 0xBF, 0xBD);
			}
		} else if (c >= 0xDC00 && c <= 0xDFFF) {
			out.push(0xEF, 0xBF, 0xBD);
		} else {
			out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
		}
	}
	return out;
}

// Read the ini as UTF-8 text and emit a C byte array. A binary mode Read()
// returns a value JScript cannot iterate, so read text and encode the bytes
function generate_micro_default_ini(source_path, target_path)
{
	if (!FSO.FileExists(source_path)) {
		ERROR("the micro default ini file " + source_path + " does not exist");
	}

	var text;
	var stream = WScript.CreateObject("ADODB.Stream");
	stream.Type = 2;
	stream.Charset = "utf-8";
	stream.Open();
	stream.LoadFromFile(source_path);
	text = stream.ReadText();
	stream.Close();

	// drop CR so a checkout with windows line endings bakes the same bytes as
	// sapi/micro/gen_default_ini.sh
	text = text.replace(/\r/g, "");

	var bytes = micro_utf8_bytes(text);
	var lines = [];
	lines.push("/* generated from " + FSO.GetFileName(source_path) + ", do not edit */");
	lines.push("static const unsigned char php_micro_default_ini[] = {");
	var line = "\t";
	for (var i = 0; i < bytes.length; i++) {
		line += bytes[i];
		if ((i + 1) % 16 === 0) {
			lines.push(line + ",");
			line = "\t";
		} else {
			line += ", ";
		}
	}
	if (line !== "\t") {
		lines.push(line.replace(/, $/, "") + ",");
	}
	lines.push("\t0, 0");
	lines.push("};");

	var out = FSO.CreateTextFile(target_path, true);
	out.Write(lines.join("\r\n") + "\r\n");
	out.Close();
}

(function () {
	if (WScript.Arguments.Length != 2) {
		WScript.Echo("usage: gen_default_ini.js <ini file> <output header>");
		WScript.Quit(1);
	}
	generate_micro_default_ini(WScript.Arguments(0), WScript.Arguments(1));
})();
