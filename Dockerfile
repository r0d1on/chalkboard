FROM python:3.11
COPY ./requirements.txt /opt/app/requirements.txt

WORKDIR /opt/app
RUN pip install --requirement requirements.txt

COPY . /opt/app

ENTRYPOINT [ "/opt/app/start.sh" ]

