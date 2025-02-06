from app import create_app

app = create_app()

@app.route('/test')
def test():
    return 'Test route works!'

if __name__ == '__main__':
    app.run(debug=True)
