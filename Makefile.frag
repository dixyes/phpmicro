
micro: $(SAPI_MICRO_PATH)

$(SAPI_MICRO_PATH): $(PHP_GLOBAL_OBJS) $(PHP_BINARY_OBJS) $(PHP_MICRO_OBJS)
	$(BUILD_MICRO)

# The default ini entries are compiled into the sfx. Generate the header from
# the ini file at build time, so editing the ini file is enough to update it
MICRO_INI_HEADER = sapi/micro/php_micro_default_ini.h

$(MICRO_INI_HEADER): $(MICRO_DEFAULT_INI) $(srcdir)/sapi/micro/gen_default_ini.sh
	@$(SHELL) $(srcdir)/sapi/micro/gen_default_ini.sh "$(MICRO_DEFAULT_INI)" $(MICRO_INI_HEADER)

sapi/micro/php_micro.lo: $(MICRO_INI_HEADER)

MICRO_EXES = sapi/micro/tests/simpleecho.exe sapi/micro/tests/fakecmd.exe

$(MICRO_EXES): $(SAPI_MICRO_PATH)
	@binname=$@;\
	cat $(SAPI_MICRO_PATH) $${binname%.exe}.php > $@ || {\
		rm $@; \
		exit 1; \
	}
	@chmod 0755 $@

MICRO_FAKECMD=sapi/micro/tests/fakecmd.exe

micro_test: $(SAPI_MICRO_PATH) $(MICRO_EXES)
	@[ x"hello world" = "x`sapi/micro/tests/simpleecho.exe nonce world`" ] || {\
		echo sanity check for micro.sfx failed, the sfx generated may be corrupt. >&2 ;\
		exit 1;\
	}
	@SKIP_IO_CAPTURE_TESTS=yes \
	TEST_PHP_EXECUTABLE=$(MICRO_FAKECMD) \
	TEST_PHP_SRCDIR=$(top_srcdir) \
	CC="$(CC)" \
		$(MICRO_FAKECMD) -n $(PHP_TEST_SETTINGS) $(top_srcdir)/run-tests.php -n $(TESTS); \
	exit $$?;
