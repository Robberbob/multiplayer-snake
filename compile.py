#!/usr/bin/python2.4

import httplib, urllib, sys, os

# Define the parameters for the POST request and encode them in
# a URL-safe format.


params = urllib.urlencode([
    ('code_url','https://raw.github.com/Robberbob/multiplayer-snake/dev/client/js/body.js'),
    ('code_url','https://raw.github.com/Robberbob/multiplayer-snake/dev/client/js/game.js'),
    ('code_url','https://raw.github.com/Robberbob/multiplayer-snake/dev/client/js/jquery.min.js'),
    ('code_url','https://raw.github.com/Robberbob/multiplayer-snake/dev/client/js/keyDecode.js'),
    ('code_url','https://raw.github.com/Robberbob/multiplayer-snake/dev/client/js/level.js'),
    ('code_url','https://raw.github.com/Robberbob/multiplayer-snake/dev/client/js/snake.js'), # <--- This parameter has a new name!
    ('compilation_level', 'WHITESPACE_ONLY'),
    ('output_format', 'text'),
    ('output_info', 'compiled_code'),
  ])

# Always use the following value for the Content-type header.
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = httplib.HTTPConnection('closure-compiler.appspot.com')
conn.request('POST', '/compile', params, headers)
response = conn.getresponse()
data = response.read()
print data
conn.close()
