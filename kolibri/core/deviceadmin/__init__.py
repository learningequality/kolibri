"""
Many functions in this package rely on the database *NOT* being in use, so do
not create anything that accesses the database at load time - in fact, never
do this in Django :)
"""
