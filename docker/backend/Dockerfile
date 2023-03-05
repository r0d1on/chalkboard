FROM python:3.6
COPY ./requirements.txt /opt/requirements.txt
RUN pip install --requirement /opt/requirements.txt

WORKDIR /chalkboard
ENTRYPOINT ["/chalkboard/start.sh"]
