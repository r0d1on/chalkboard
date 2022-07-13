FROM python:3.6
COPY ./requirements.txt /opt/app/requirements.txt
WORKDIR /opt/app
RUN pip install --requirement requirements.txt
COPY . /opt/app
CMD [ "/opt/app/start.sh" ]

