#!/usr/bin/env python
# -*- coding: utf-8 -*-

import logging
import pprint
import types
import sys
import time
import os

# For pretty log messages, if available
try:
    import curses
except:
    curses = None


MAX_VARS_LINES = 30
MAX_LINE_LENGTH = 100

logger = logging.getLogger(os.path.basename(os.path.dirname(__file__)))


class RemoteAddressFormatter(logging.Formatter):
    """Formatter that makes sure REMOTE_ADDR is available."""

    def format(self, record):
        if ('%(REMOTE_ADDR)' in self._fmt
            and 'REMOTE_ADDR' not in record.__dict__):
            record.__dict__['REMOTE_ADDR'] = None
        return logging.Formatter.format(self, record)


class UTF8SafeFormatter(RemoteAddressFormatter):
    def __init__(self, fmt=None, datefmt=None, encoding='utf-8'):
        logging.Formatter.__init__(self, fmt, datefmt)
        self.encoding = encoding

    def formatException(self, e):
        r = logging.Formatter.formatException(self, e)
        if type(r) in [types.StringType]:
            r = r.decode(self.encoding, 'replace') # Convert to unicode
        return r

    def format(self, record):
        t = RemoteAddressFormatter.format(self, record)
        if type(t) in [types.UnicodeType]:
            t = t.encode(self.encoding, 'replace')
        return t



class VerboseExceptionFormatter(UTF8SafeFormatter, object):
    def __init__(self, log_locals_on_exception=True, *args, **kwargs):
        UTF8SafeFormatter.__init__(self, *args, **kwargs)
        self._log_locals = log_locals_on_exception

    def formatException(self, exc_info):
        # First get the original formatted exception.
        exc_text = super(UTF8SafeFormatter, self).formatException(exc_info)
        if not self._log_locals:
            return exc_text
            # Now we're going to format and add the locals information.
        output_lines = [exc_text, '\n']
        tb = exc_info[2]  # This is the outermost frame of the traceback.
        if tb:
            while tb.tb_next:
                tb = tb.tb_next  # Zoom to the innermost frame.
            output_lines.append('Locals at innermost frame:\n')
            locals_text = pprint.pformat(tb.tb_frame.f_locals, indent=2)
            locals_lines = locals_text.split('\n')
            if len(locals_lines) > MAX_VARS_LINES:
                locals_lines = locals_lines[:MAX_VARS_LINES]
                locals_lines[-1] = '...'
            output_lines.extend(
                line[:MAX_LINE_LENGTH - 3] + '...' if len(line) > MAX_LINE_LENGTH else line
                for line in locals_lines)
            output_lines.append('\n')
            return '\n'.join(output_lines)
